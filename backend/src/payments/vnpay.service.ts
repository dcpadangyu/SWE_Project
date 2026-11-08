import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { VNPay, HashAlgorithm, ProductCode, VnpLocale } from 'vnpay';

import type { QueryDr, ReturnQueryFromVNPay } from 'vnpay';
import { randomUUID } from 'node:crypto';
import type { Payment } from '@prisma/client';

interface CreatePaymentUrlInput {
  paymentId: string;
  orderNumber: number;
  amount: number;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class VnpayService {
  private client?: VNPay;

  private getRequiredEnv(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        `Chưa cấu hình biến môi trường ${name}.`,
      );
    }

    return value;
  }

  private getClient(): VNPay {
    if (!this.client) {
      const mode = process.env.VNPAY_TEST_MODE?.trim() ?? 'true';
      if (mode !== 'true' && mode !== 'false') {
        throw new ServiceUnavailableException('VNPAY_TEST_MODE phải là true hoặc false.');
      }
      const testMode = mode === 'true';
      // SDK ép cả hai host về sandbox khi testMode=true.
      const host = this.getGatewayOrigin(
        process.env.VNPAY_HOST?.trim() ||
          (testMode ? 'https://sandbox.vnpayment.vn' : this.getRequiredEnv('VNPAY_HOST')),
      );
      if (testMode && host !== 'https://sandbox.vnpayment.vn') {
        throw new ServiceUnavailableException(
          'Host khác sandbox yêu cầu VNPAY_TEST_MODE=false.',
        );
      }
      const queryHost = this.getGatewayOrigin(
        process.env.VNPAY_QUERY_HOST?.trim() || host,
      );
      if (testMode && queryHost !== host) {
        throw new ServiceUnavailableException(
          'VNPAY_QUERY_HOST phải là host sandbox khi VNPAY_TEST_MODE=true.',
        );
      }
      this.client = new VNPay({
        tmnCode: this.getRequiredEnv('VNPAY_TMN_CODE'),
        secureSecret: this.getRequiredEnv('VNPAY_HASH_SECRET'),
        vnpayHost: host,
        queryDrAndRefundHost: queryHost,
        testMode,
        hashAlgorithm: HashAlgorithm.SHA512,
        enableLog: false,
      });
    }

    return this.client;
  }

  private getGatewayOrigin(value: string): string {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password ||
          url.pathname !== '/' || url.search || url.hash) throw new Error();
      return url.origin;
    } catch {
      throw new ServiceUnavailableException(
        'Host VNPay phải là HTTPS origin, không chứa đường dẫn, thông tin đăng nhập hoặc query.',
      );
    }
  }

  // Định dạng yyyyMMddHHmmss theo giờ Việt Nam.
  private formatDate(date: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? '';

    return Number(
      get('year') +
        get('month') +
        get('day') +
        get('hour') +
        get('minute') +
        get('second'),
    );
  }

  buildPaymentUrl(input: CreatePaymentUrlInput): string {
    return this.getClient().buildPaymentUrl({
      // SDK tự nhân 100; truyền số tiền VND trực tiếp.
      vnp_Amount: input.amount,

      // Mỗi lần thử thanh toán dùng một Payment.id riêng.
      vnp_TxnRef: input.paymentId,

      vnp_OrderInfo: `Thanh toan don hang ${input.orderNumber}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: this.getRequiredEnv('VNPAY_RETURN_URL'),
      vnp_IpAddr: input.ipAddress,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: this.formatDate(input.createdAt),
      vnp_ExpireDate: this.formatDate(input.expiresAt),
    });
  }

  verifyIpn(query: ReturnQueryFromVNPay) {
    return this.getClient().verifyIpnCall(query);
  }

  async queryPayment(payment: Pick<Payment, 'id' | 'createdAt'>, ipAddress: string) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.getClient().queryDr({
          vnp_RequestId: randomUUID().replaceAll('-', ''),
          vnp_TxnRef: payment.id,
          vnp_TransactionDate: this.formatDate(payment.createdAt),
          vnp_CreateDate: this.formatDate(new Date()),
          vnp_IpAddr: ipAddress,
          vnp_OrderInfo: `Kiem tra giao dich ${payment.id}`,
          // Theo tài liệu VNPay trường TransactionNo là tùy chọn;
          // typings SDK 2.5.2 lại đánh dấu bắt buộc. Không gửi số 0 giả.
        } as QueryDr),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new ServiceUnavailableException(
            'VNPay chưa phản hồi. Vui lòng kiểm tra lại sau.',
          )), 8000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  verifyReturn(query: ReturnQueryFromVNPay) {
    return this.getClient().verifyReturnUrl(query);
  }

  getMerchantCode(): string {
    return this.getRequiredEnv('VNPAY_TMN_CODE');
  }
}
