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
      this.client = new VNPay({
        tmnCode: this.getRequiredEnv('VNPAY_TMN_CODE'),
        secureSecret: this.getRequiredEnv('VNPAY_HASH_SECRET'),
        vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn',
        testMode: true,
        hashAlgorithm: HashAlgorithm.SHA512,
        enableLog: false,
      });
    }

    return this.client;
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
