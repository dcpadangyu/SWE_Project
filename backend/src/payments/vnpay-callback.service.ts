import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { OrderStatus, PaymentStatus, TransactionType } from '@prisma/client';

import { assertOrderTransition } from '../orders/order-state-machine';

import type { ReturnQueryFromVNPay } from 'vnpay';

import { PrismaService } from '../prisma/prisma.service';
import { VnpayService } from './vnpay.service';
import { expireOrderInTransaction } from '../orders/order-payment-window';

export type VerifiedPaymentResult = Pick<
  ReturnType<VnpayService['verifyIpn']>,
  'isVerified' | 'isSuccess' | 'message' | 'vnp_TmnCode' | 'vnp_TxnRef' |
  'vnp_Amount' | 'vnp_ResponseCode' | 'vnp_TransactionStatus' | 'vnp_TransactionNo'
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

          if (await expireOrderInTransaction(tx, order)) {
            order.status = OrderStatus.CANCELLED;
          }

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
                completedAt: new Date(),
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
                errorCode: 'RECONCILIATION_REQUIRED',
                errorMessage: `VNPay response=${responseCode}, status=${transactionStatus}`,
              },
            });

            this.logger.warn(`Payment ${payment.id} requires reconciliation.`);

            return reply('00', 'Notification recorded');
          }

          // 4. Thành công nhưng đơn/giao dịch không còn ở bước chờ.
          if (
            payment.status !== PaymentStatus.PENDING ||
            order.status !== OrderStatus.PENDING
          ) {
            return requireRefund(
              'Đã thu tiền nhưng trạng thái đơn cần kiểm tra thủ công.',
            );
          }

          // Kiểm tra và khóa voucher trước khi sử dụng lượt.
          let voucherId: string | undefined;

          if (order.voucherCode) {
            await tx.$queryRaw`
            SELECT "id"
            FROM "vouchers"
            WHERE "code" = ${order.voucherCode}
            FOR UPDATE
          `;

            const voucher = await tx.voucher.findUnique({
              where: {
                code: order.voucherCode,
              },
            });

            if (
              !voucher ||
              (voucher.usageLimit !== null &&
                voucher.usedCount >= voucher.usageLimit)
            ) {
              return requireRefund(
                'Voucher không còn lượt sử dụng sau khi thanh toán.',
              );
            }

            voucherId = voucher.id;
          }

          // Cộng dồn các dòng cùng sản phẩm.
          const quantities = new Map<string, number>();

          for (const item of order.items) {
            quantities.set(
              item.productId,
              (quantities.get(item.productId) ?? 0) + item.quantity,
            );
          }

          // Khóa theo thứ tự cố định để giảm nguy cơ deadlock.
          const productIds = [...quantities.keys()].sort();

          // Kiểm tra tất cả món trước khi bắt đầu trừ kho.
          for (const productId of productIds) {
            await tx.$queryRaw`
            SELECT "id"
            FROM "products"
            WHERE "id" = ${productId}
            FOR UPDATE
          `;

            const product = await tx.product.findUnique({
              where: {
                id: productId,
              },
            });

            const quantity = quantities.get(productId)!;

            if (!product || !product.isAvailable || product.stock < quantity) {
              return requireRefund(
                'Đã thu tiền nhưng sản phẩm không đủ tồn kho.',
              );
            }
          }

          // 5. Trừ kho sau khi tất cả món đã hợp lệ.
          for (const productId of productIds) {
            const quantity = quantities.get(productId)!;

            const updated = await tx.product.updateMany({
              where: {
                id: productId,
                stock: {
                  gte: quantity,
                },
              },
              data: {
                stock: {
                  decrement: quantity,
                },
                version: {
                  increment: 1,
                },
              },
            });

            if (updated.count !== 1) {
              // Ném lỗi để rollback cả transaction.
              throw new Error('Stock update conflict');
            }
          }

          assertOrderTransition(order.status, OrderStatus.PAID);

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
              completedAt: new Date(),
              errorCode: null,
              errorMessage: null,
            },
          });

          if (voucherId) {
            await tx.voucher.update({
              where: {
                id: voucherId,
              },
              data: {
                usedCount: {
                  increment: 1,
                },
              },
            });
          }

          // Quy tắc hiện tại của project: 10.000 VND = 1 điểm.
          const points = Math.floor(payment.amount.toNumber() / 10000);

          if (points > 0) {
            await tx.user.update({
              where: {
                id: order.userId,
              },
              data: {
                loyaltyPoints: {
                  increment: points,
                },
              },
            });

            await tx.loyaltyTransaction.create({
              data: {
                userId: order.userId,
                orderId: order.id,
                points,
                type: TransactionType.EARN,
              },
            });
          }

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
