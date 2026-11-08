import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { OrderStatus, PaymentStatus } from '@prisma/client';

import { assertOrderTransition } from '../orders/order-state-machine';

import type { ReturnQueryFromVNPay } from 'vnpay';

import { PrismaService } from '../prisma/prisma.service';
import { VnpayService } from './vnpay.service';
import { fulfillPaidOrderInTransaction } from './fulfill-paid-order';
import { expireOrderInTransaction, ORDER_PAYMENT_EXPIRED } from '../orders/order-payment-window';
import { isVnpayPaymentOnTime, parseVnpayPayDate } from './vnpay-payment-time';

export type VerifiedPaymentResult = Pick<
  ReturnType<VnpayService['verifyIpn']>,
  'isVerified' | 'isSuccess' | 'message' | 'vnp_TmnCode' | 'vnp_TxnRef' |
  'vnp_Amount' | 'vnp_ResponseCode' | 'vnp_TransactionStatus' | 'vnp_TransactionNo' | 'vnp_PayDate'
>;

@Injectable()
export class VnpayCallbackService {
  private readonly logger = new Logger(VnpayCallbackService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
  ) {}

  async handleIpn(
    rawQuery: unknown,
  ): Promise<{ RspCode: string; Message: string }> {
    const reply = (RspCode: string, Message: string) => ({
      RspCode,
      Message,
    });

    // 1. Kiểm tra định dạng query.
    let query: ReturnQueryFromVNPay;

    try {
      query = this.parseQuery(rawQuery);
    } catch {
      return reply('97', 'Invalid request');
    }

    // 2. Xác minh chữ ký bằng SDK.
    let result: ReturnType<VnpayService['verifyIpn']>;

    try {
      result = this.vnpayService.verifyIpn(query);
    } catch {
      return reply('99', 'Cannot verify notification');
    }

    if (!result.isVerified) {
      return reply('97', 'Invalid checksum');
    }

    return this.confirmVerifiedPayment(result);
  }

  // Dùng chung cho IPN đã xác minh và kết quả querydr đã xác minh.
  // Không nhận trực tiếp dữ liệu từ endpoint/browser.
  async confirmVerifiedPayment(result: VerifiedPaymentResult) {
    const reply = (RspCode: string, Message: string) => ({ RspCode, Message });
    if (!result.isVerified) return reply('97', 'Invalid checksum');

    try {
      if (String(result.vnp_TmnCode) !== this.vnpayService.getMerchantCode()) {
        return reply('97', 'Invalid merchant');
      }

      const responseCode = String(result.vnp_ResponseCode ?? '').padStart(
        2,
        '0',
      );

      const transactionStatus =
        result.vnp_TransactionStatus === undefined
          ? ''
          : String(result.vnp_TransactionStatus).padStart(2, '0');

      if (!transactionStatus) {
        return reply('97', 'Missing transaction status');
      }

      const succeeded =
        result.isSuccess && responseCode === '00' && transactionStatus === '00';

      // Chỉ kết luận thất bại khi trạng thái giao dịch xác nhận lỗi.
      const failed =
        transactionStatus === '02' &&
        responseCode !== '00' &&
        responseCode !== '07';

      if (succeeded && !result.vnp_TransactionNo) {
        return reply('97', 'Missing transaction number');
      }

      const paidAt = succeeded ? parseVnpayPayDate(result.vnp_PayDate) : null;
      if (succeeded && result.vnp_PayDate !== undefined && result.vnp_PayDate !== '' && !paidAt) {
        return reply('97', 'Invalid payment date');
      }

      const foundPayment = await this.prisma.payment.findUnique({
        where: {
          id: String(result.vnp_TxnRef),
        },
      });

      if (!foundPayment || foundPayment.provider !== 'VNPAY') {
        return reply('01', 'Payment not found');
      }

      // SDK đã quy đổi số tiền về VND.
      if (
        !Number.isFinite(result.vnp_Amount) ||
        !foundPayment.amount.equals(result.vnp_Amount)
      ) {
        return reply('04', 'Invalid amount');
      }

      return await this.prisma.$transaction(
        async (tx) => {
          // Cùng cách khóa với API tạo thanh toán.
          await tx.$queryRaw`
          SELECT "id"
          FROM "orders"
          WHERE "id" = ${foundPayment.orderId}
          FOR UPDATE
        `;

          // Đọc lại sau khi lấy khóa để chống hai IPN song song.
          const payment = await tx.payment.findUniqueOrThrow({
            where: {
              id: foundPayment.id,
            },
          });

          const order = await tx.order.findUniqueOrThrow({
            where: {
              id: payment.orderId,
            },
            include: {
              items: true,
            },
          });

          if (
            payment.status === PaymentStatus.SUCCESS ||
            payment.status === PaymentStatus.REFUNDED
          ) {
            return reply('02', 'Already confirmed');
          }

          const paidOnTime = succeeded && paidAt !== null && isVnpayPaymentOnTime(paidAt, order, payment);
          // IPN về chậm không được tự biến thanh toán đúng hạn thành quá hạn.
          if (!paidOnTime && await expireOrderInTransaction(tx, order)) {
            order.status = OrderStatus.CANCELLED;
          }

          const recoverTimedOutOrder = paidOnTime && order.status === OrderStatus.CANCELLED &&
            payment.status === PaymentStatus.PENDING && payment.errorCode === ORDER_PAYMENT_EXPIRED;

          const transactionCode = result.vnp_TransactionNo
            ? String(result.vnp_TransactionNo)
            : null;

          /*
           * Đã nhận thông báo thu tiền nhưng không thể giao đơn:
           * ghi nhận tiền thực tế, đánh dấu cần xử lý hoàn tiền.
           * Không được tự ghi REFUNDED khi chưa hoàn tiền.
           */
          const requireRefund = async (reason: string) => {
            await tx.payment.update({
              where: {
                id: payment.id,
              },
              data: {
                status: PaymentStatus.SUCCESS,
                transactionCode,
                completedAt: paidAt ?? new Date(),
                errorCode: 'REFUND_REQUIRED',
                errorMessage: reason,
              },
            });

            if (
              order.status === OrderStatus.PENDING ||
              order.status === OrderStatus.PAYMENT_FAILED
            ) {
              assertOrderTransition(order.status, OrderStatus.CANCELLED);

              await tx.order.update({
                where: {
                  id: order.id,
                },
                data: {
                  status: OrderStatus.CANCELLED,
                },
              });
            }

            this.logger.warn(`Payment ${payment.id} requires refund review.`);

            return reply('00', 'Notification recorded');
          };

          // 3. Xử lý giao dịch thất bại.
          if (failed) {
            if (payment.status === PaymentStatus.FAILED) {
              return reply('02', 'Already confirmed');
            }

            await tx.payment.update({
              where: {
                id: payment.id,
              },
              data: {
                status: PaymentStatus.FAILED,
                transactionCode,
                errorCode: responseCode,
                errorMessage: result.message,
                completedAt: new Date(),
              },
            });

            const latest = await tx.payment.findFirst({
              where: { orderId: order.id },
              orderBy: { attemptNumber: 'desc' },
              select: { id: true },
            });

            // IPN/query của lượt cũ không được làm hỏng lượt mới đang chờ.
            if (order.status === OrderStatus.PENDING && latest?.id === payment.id) {
              const nextStatus =
                payment.attemptNumber >= 3
                  ? OrderStatus.CANCELLED
                  : OrderStatus.PAYMENT_FAILED;

              assertOrderTransition(order.status, nextStatus);

              await tx.order.update({
                where: {
                  id: order.id,
                },
                data: {
                  status: nextStatus,
                },
              });
            }

            return reply('00', 'Confirm Success');
          }

          /*
           * Trạng thái chưa rõ, nghi ngờ hoặc đảo giao dịch:
           * giữ chờ để đối soát, không cho phép thu tiền lại ngay.
           */
          if (!succeeded) {
            if (payment.status === PaymentStatus.FAILED) {
              return reply('02', 'Already confirmed');
            }

            await tx.payment.update({
              where: {
                id: payment.id,
              },
              data: {
                // Giữ nguồn gốc tự hủy để một IPN đúng hạn về sau còn đối soát được.
                errorCode: payment.errorCode === ORDER_PAYMENT_EXPIRED
                  ? ORDER_PAYMENT_EXPIRED : 'RECONCILIATION_REQUIRED',
                errorMessage: `VNPay response=${responseCode}, status=${transactionStatus}`,
              },
            });

            this.logger.warn(`Payment ${payment.id} requires reconciliation.`);

            return reply('00', 'Notification recorded');
          }

          if (paidAt && !paidOnTime) {
            return requireRefund('Thời điểm thanh toán nằm ngoài hạn của giao dịch, cần đối soát hoàn tiền.');
          }

          // 4. Thành công nhưng đơn/giao dịch không còn ở bước chờ.
          if (
            payment.status !== PaymentStatus.PENDING ||
            (order.status !== OrderStatus.PENDING && !recoverTimedOutOrder)
          ) {
            return requireRefund(
              'Đã thu tiền nhưng trạng thái đơn cần kiểm tra thủ công.',
            );
          }

          if (recoverTimedOutOrder) {
            const collected = await tx.payment.findFirst({
              where: { orderId: order.id, status: { in: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] } },
              select: { id: true },
            });
            if (collected) return requireRefund('Đơn đã có giao dịch thu tiền khác, cần đối soát.');
          }

          const fulfillment = await fulfillPaidOrderInTransaction(tx, order, payment.amount);
          if (!fulfillment.ok) return requireRefund(fulfillment.message);

          // Ngoại lệ đối soát duy nhất: tự hủy do timeout nhưng có chứng từ ký số
          // xác nhận trả tiền đúng hạn. Không mở CANCELLED -> PAID cho API thường.
          if (!recoverTimedOutOrder) assertOrderTransition(order.status, OrderStatus.PAID);

          await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              status: OrderStatus.PAID,
            },
          });

          await tx.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              status: PaymentStatus.SUCCESS,
              transactionCode,
              completedAt: paidAt ?? new Date(),
              errorCode: null,
              errorMessage: null,
            },
          });

          return reply('00', 'Confirm Success');
        },
        {
          maxWait: 2000,
          timeout: 10000,
        },
      );
    } catch {
      // Không trả 00 khi transaction chưa commit thành công.
      this.logger.error('Không thể ghi nhận IPN VNPay.');

      return reply('99', 'Unknown error');
    }
  }

  async getReturnUrl(rawQuery: unknown): Promise<string> {
    const query = this.parseQuery(rawQuery);

    let result: ReturnType<VnpayService['verifyReturn']>;

    try {
      result = this.vnpayService.verifyReturn(query);
    } catch {
      throw new BadRequestException('Dữ liệu trả về từ VNPay không hợp lệ.');
    }

    if (!result.isVerified) {
      throw new BadRequestException('Chữ ký trả về từ VNPay không hợp lệ.');
    }

    if (result.vnp_TmnCode !== this.vnpayService.getMerchantCode()) {
      throw new BadRequestException('Mã merchant không hợp lệ.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: {
        id: String(result.vnp_TxnRef),
      },
    });

    if (!payment || payment.provider !== 'VNPAY') {
      throw new NotFoundException('Không tìm thấy giao dịch VNPay.');
    }

    // SDK đã quy đổi số tiền về VND.
    if (
      !Number.isFinite(result.vnp_Amount) ||
      !payment.amount.equals(result.vnp_Amount)
    ) {
      throw new BadRequestException('Số tiền trả về không khớp giao dịch.');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Chuyển tới đơn lưu trong DB, không tin orderId từ trình duyệt.
    const destination = new URL(
      `/orders/${encodeURIComponent(payment.orderId)}`,
      frontendUrl,
    );

    return destination.toString();
  }

  private parseQuery(rawQuery: unknown): ReturnQueryFromVNPay {
    if (
      typeof rawQuery !== 'object' ||
      rawQuery === null ||
      Array.isArray(rawQuery)
    ) {
      throw new BadRequestException('Query không hợp lệ.');
    }

    const query: Record<string, string> = {};

    for (const [key, value] of Object.entries(rawQuery)) {
      if (typeof value !== 'string') {
        throw new BadRequestException('Tham số VNPay phải là chuỗi đơn.');
      }

      query[key] = value;
    }

    const requiredFields = [
      'vnp_TxnRef',
      'vnp_TmnCode',
      'vnp_Amount',
      'vnp_ResponseCode',
      'vnp_SecureHash',
    ];

    for (const field of requiredFields) {
      if (!query[field]) {
        throw new BadRequestException(`Thiếu tham số ${field}.`);
      }
    }

    return query as unknown as ReturnQueryFromVNPay;
  }
}
