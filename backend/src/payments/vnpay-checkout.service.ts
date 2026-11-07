import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { randomUUID } from 'node:crypto';
import type { Order, Payment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertOrderTransition } from '../orders/order-state-machine';
import { VnpayService } from './vnpay.service';
import { CreateVnpayPaymentDto } from './dto/create-vnpay-payment.dto';
import { expireOrderInTransaction, orderPaymentDeadline } from '../orders/order-payment-window';

@Injectable()
export class VnpayCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vnpayService: VnpayService,
  ) {}

  private resumePayment(
    payment: Payment,
    order: Pick<Order, 'id' | 'status' | 'totalAmount'>,
  ) {
    if (
      payment.provider !== 'VNPAY' ||
      payment.status !== PaymentStatus.PENDING ||
      order.status !== OrderStatus.PENDING ||
      payment.errorCode ||
      !payment.amount.equals(order.totalAmount)
    ) {
      throw new ConflictException(
        'Giao dịch cần được xác minh. Vui lòng kiểm tra lại trạng thái đơn hàng.',
      );
    }

    if (
      !payment.paymentUrl ||
      !payment.expiresAt ||
      payment.expiresAt.getTime() <= Date.now()
    ) {
      throw new ConflictException(
        'URL thanh toán đã hết hạn. Cần xác minh giao dịch cũ trước khi thanh toán lại.',
      );
    }

    return {
      replayed: true,
      orderId: order.id,
      paymentId: payment.id,
      status: payment.status,
      paymentUrl: payment.paymentUrl,
      expiresAt: payment.expiresAt,
    };
  }

  async createPayment(
    userId: string,
    rawKey: string | undefined,
    dto: CreateVnpayPaymentDto,
    ipAddress: string,
  ) {
    const key = rawKey?.trim();

    if (!key || key.length > 128) {
      throw new BadRequestException(
        'Idempotency-Key phải có độ dài từ 1 đến 128 ký tự.',
      );
    }

    try {
      const outcome = await this.prisma.$transaction(async (tx) => {
        /*
         * Khóa đúng đơn thuộc user hiện tại.
         *
         * Hai request cùng đơn sẽ xử lý lần lượt, tránh cùng tạo
         * nhiều payment đang chờ hoặc trùng attemptNumber.
         *
         * Template của Prisma truyền tham số an toàn,
         * không nối chuỗi SQL từ dữ liệu client.
         */
        const ownedOrders = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "orders"
          WHERE "id" = ${dto.orderId}
            AND "user_id" = ${userId}
          FOR UPDATE
        `;

        if (ownedOrders.length === 0) {
          throw new NotFoundException('Không tìm thấy đơn hàng.');
        }

        // Đọc sau khi đã lấy được khóa để có trạng thái mới nhất.
        const order = await tx.order.findUniqueOrThrow({
          where: { id: dto.orderId },
        });

        if (await expireOrderInTransaction(tx, order)) {
          return { expired: true as const };
        }

        const activePayments = await tx.payment.findMany({
          where: {
            orderId: order.id,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.SUCCESS] },
          },
        });

        if (activePayments.some((payment) => payment.status === PaymentStatus.SUCCESS)) {
          throw new ConflictException(
            'Đơn hàng đã có giao dịch thu tiền. Vui lòng kiểm tra trạng thái đơn hàng.',
          );
        }

        if (activePayments.length > 1) {
          throw new ConflictException('Có nhiều giao dịch chờ. Cần xác minh trước khi tiếp tục.');
        }

        // Kiểm tra khóa đã được sử dụng chưa.
        const existing = await tx.payment.findUnique({
          where: { idempotencyKey: key },
        });

        if (existing) {
          if (existing.orderId !== order.id || existing.provider !== 'VNPAY') {
            throw new ConflictException(
              'Idempotency-Key đã được sử dụng cho yêu cầu khác.',
            );
          }

          return this.resumePayment(existing, order);
        }

        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.PAYMENT_FAILED
        ) {
          throw new ConflictException(
            'Trạng thái đơn hàng không cho phép thanh toán.',
          );
        }

        // Cho phép quay lại từ tab khác hoặc sau khi mất khóa local,
        // nhưng luôn dùng đúng giao dịch cũ, không mở thêm lần thu tiền.
        const pendingPayment = activePayments[0];

        if (pendingPayment) {
          return this.resumePayment(pendingPayment, order);
        }

        const previous = await tx.payment.aggregate({
          where: { orderId: order.id },
          _max: { attemptNumber: true },
        });

        const attemptNumber = (previous._max.attemptNumber ?? 0) + 1;

        if (attemptNumber > 3) {
          throw new ConflictException(
            'Đơn hàng đã đạt giới hạn 3 lần thử thanh toán.',
          );
        }

        const amount = order.totalAmount.toNumber();

        if (!Number.isSafeInteger(amount) || amount < 5000) {
          throw new BadRequestException(
            'Số tiền thanh toán phải là số nguyên VND và tối thiểu 5.000 đồng.',
          );
        }

        if (order.status === OrderStatus.PAYMENT_FAILED) {
          assertOrderTransition(order.status, OrderStatus.PENDING);

          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PENDING },
          });
        }

        const paymentId = randomUUID();
        const createdAt = new Date();
        const expiresAt = orderPaymentDeadline(order.createdAt);

        // Tạo URL bằng SDK, không gọi HTTP tới VNPay tại đây.
        const paymentUrl = this.vnpayService.buildPaymentUrl({
          paymentId,
          orderNumber: order.orderNumber,
          amount,
          ipAddress,
          createdAt,
          expiresAt,
        });

        const payment = await tx.payment.create({
          data: {
            id: paymentId,
            orderId: order.id,
            attemptNumber,
            idempotencyKey: key,

            // Phân loại theo mô hình hiện tại của project.
            paymentMethod: PaymentMethod.BANK_CARD,
            provider: 'VNPAY',

            amount: order.totalAmount,
            status: PaymentStatus.PENDING,

            paymentUrl,
            expiresAt,
            createdAt,
          },
        });

        return {
          replayed: false,
          orderId: order.id,
          paymentId: payment.id,
          status: payment.status,
          paymentUrl,
          expiresAt,
        };
      });
      // Ném lỗi sau commit để việc hủy đơn không bị rollback.
      if ('expired' in outcome) {
        throw new ConflictException('Đơn đã hủy do quá hạn thanh toán 10 phút.');
      }
      return outcome;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Khóa thanh toán đã được sử dụng. Hãy kiểm tra giao dịch hiện tại.',
        );
      }

      throw error;
    }
  }
}
