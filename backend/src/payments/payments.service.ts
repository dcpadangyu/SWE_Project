import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { assertOrderTransition } from '../orders/order-state-machine';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { fulfillPaidOrderInTransaction } from './fulfill-paid-order';
import { expireOrderInTransaction } from '../orders/order-payment-window';

export interface PaymentExecutionResult {
  replayed: boolean;
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
  totalAmount: string;
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionCode?: string | null;
    amount: string;
    completedAt?: Date | null;
    errorMessage?: string | null;
  };
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Xử lý thanh toán đơn hàng (Task 8 + Task 10.2 & 10.3)
   *
   * 1. Idempotent check (Task 10.2): Tra cứu Idempotency-Key, nếu đã hoàn tất thì phát lại kết quả cũ.
   * 2. Quyền & Ràng buộc: Đúng chủ sở hữu, đơn ở trạng thái PENDING/PAYMENT_FAILED, không quá 3 lần thử.
   * 3. Xử lý cổng thanh toán:
   *    - Thất bại (simulateFailure): chuyển PAYMENT_FAILED (hoặc CANCELLED nếu quá 3 lần), không trừ kho.
   *    - Thành công: mở Transaction trừ kho bằng Optimistic Locking (version) và chuyển đơn sang PAID.
   */
  async processPayment(
    userId: string,
    idempotencyKey: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentExecutionResult> {
    const key = idempotencyKey?.trim();
    if (!key || key.length === 0 || key.length > 128) {
      throw new BadRequestException(
        'Header Idempotency-Key phải có độ dài từ 1 đến 128 ký tự.',
      );
    }

    // 1. Kiểm tra Idempotency: nếu khóa đã xử lý trước đó, phát lại kết quả (Task 10.2)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
      include: { order: true },
    });

    if (existingPayment) {
      if (existingPayment.order.userId && existingPayment.order.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền thanh toán đơn hàng của người khác.');
      }
      if (existingPayment.provider && existingPayment.provider !== 'MOCK') {
        throw new ConflictException('Khóa này thuộc giao dịch VNPay. Không thể xác nhận bằng thanh toán Mock.');
      }
      if (existingPayment.orderId !== dto.orderId) {
        throw new ConflictException(
          'Idempotency-Key đã được sử dụng cho một đơn hàng khác.',
        );
      }

      if (existingPayment.status === PaymentStatus.SUCCESS) {
        return {
          replayed: true,
          orderId: existingPayment.orderId,
          orderNumber: existingPayment.order.orderNumber,
          status: existingPayment.order.status,
          totalAmount: existingPayment.amount.toFixed(2),
          payment: {
            id: existingPayment.id,
            method: existingPayment.paymentMethod,
            status: existingPayment.status,
            transactionCode: existingPayment.transactionCode,
            amount: existingPayment.amount.toFixed(2),
            completedAt: existingPayment.completedAt,
          },
        };
      }

      if (existingPayment.status === PaymentStatus.FAILED) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            code: 'PAYMENT_FAILED',
            message:
              existingPayment.errorMessage ||
              'Giao dịch thanh toán trước đó đã thất bại.',
            replayed: true,
            orderId: existingPayment.orderId,
            attemptNumber: existingPayment.attemptNumber,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    // 2. Tra cứu đơn hàng và kiểm tra điều kiện tiên quyết
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần thanh toán.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền thanh toán đơn hàng của người khác.',
      );
    }

    // Chặn cả nhánh mô phỏng lỗi và giới hạn số lần thử nếu còn giao dịch VNPay.
    const existingVnpay = await this.prisma.payment.findFirst({
      where: { orderId: order.id, provider: 'VNPAY', status: { in: [PaymentStatus.PENDING, PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] } },
      select: { id: true },
    });
    if (existingVnpay) {
      throw new ConflictException('Đơn có giao dịch VNPay cần đối soát. Không thể chuyển sang thanh toán Mock.');
    }

    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new ConflictException(
        'Đơn hàng đã được thanh toán hoặc đã hoàn tất.',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException(
        'Đơn hàng đã bị hủy, không thể tiến hành thanh toán.',
      );
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new ConflictException(
        `Trạng thái đơn hàng (${order.status}) không hợp lệ để thanh toán.`,
      );
    }

    // Tính số lần thử thanh toán của đơn
    const previousAttempts = await this.prisma.payment.count({
      where: { orderId: dto.orderId },
    });
    const attemptNumber = previousAttempts + 1;

    if (attemptNumber > 3) {
      assertOrderTransition(order.status, OrderStatus.CANCELLED);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
      throw new ConflictException(
        'Đơn hàng đã vượt quá 3 lần thanh toán thất bại và đã bị hủy.',
      );
    }

    // Nếu đơn hàng đang ở trạng thái PAYMENT_FAILED và khách tiến hành thử lại,
    // chuyển đổi logic hợp lệ là PAYMENT_FAILED -> PENDING trước khi sang trạng thái kết quả mới
    let currentStatus = order.status;
    if (currentStatus === OrderStatus.PAYMENT_FAILED) {
      assertOrderTransition(currentStatus, OrderStatus.PENDING);
      currentStatus = OrderStatus.PENDING;
    }

    // 3. Xử lý trường hợp Cổng thanh toán TỪ CHỐI (Failure branch - AC-13.3)
    if (dto.simulateFailure) {
      const isFinalFailure = attemptNumber >= 3;
      const nextStatus = isFinalFailure
        ? OrderStatus.CANCELLED
        : OrderStatus.PAYMENT_FAILED;

      assertOrderTransition(currentStatus, nextStatus);

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus },
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            attemptNumber,
            idempotencyKey: key,
            paymentMethod: dto.paymentMethod,
            amount: order.totalAmount,
            status: PaymentStatus.FAILED,
            errorCode: 'GATEWAY_DECLINED',
            errorMessage: isFinalFailure
              ? 'Giao dịch bị từ chối. Đã vượt quá 3 lần thử, đơn hàng đã bị hủy.'
              : 'Giao dịch bị từ chối bởi cổng thanh toán. Quý khách có thể thử lại.',
            completedAt: new Date(),
          },
        });
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          code: 'PAYMENT_FAILED',
          message: isFinalFailure
            ? 'Giao dịch bị từ chối. Đã vượt quá 3 lần thử, đơn hàng đã bị hủy.'
            : 'Giao dịch bị từ chối bởi cổng thanh toán. Quý khách có thể thử lại.',
          orderId: order.id,
          attemptNumber,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 4. Xử lý trường hợp Cổng thanh toán THÀNH CÔNG (Happy Path - AC-13.2 & Optimistic Locking)
    assertOrderTransition(currentStatus, OrderStatus.PAID);

    const txResult = await this.prisma.$transaction(async (tx) => {
      // Cùng khóa order với VNPay; đọc lại để hai request không trừ kho/cộng điểm hai lần.
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${order.id} FOR UPDATE`;
      const current = await tx.order.findUniqueOrThrow({
        where: { id: order.id }, include: { items: true },
      });
      if (current.status !== OrderStatus.PENDING && current.status !== OrderStatus.PAYMENT_FAILED) {
        throw new ConflictException('Đơn hàng không còn ở trạng thái chờ thanh toán.');
      }
      const vnpayPayment = await tx.payment.findFirst({
        where: { orderId: current.id, provider: 'VNPAY', status: { in: [PaymentStatus.PENDING, PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] } },
        select: { id: true },
      });
      if (vnpayPayment) {
        throw new ConflictException('Đơn có giao dịch VNPay cần đối soát. Không thể chuyển sang thanh toán Mock.');
      }
      if (await expireOrderInTransaction(tx, current)) return { expired: true as const };
      const fulfillment = await fulfillPaidOrderInTransaction(tx, current, current.totalAmount);
      if (!fulfillment.ok) {
        throw new ConflictException({ code: fulfillment.code, message: fulfillment.message });
      }

      // Cập nhật trạng thái đơn hàng sang PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      });

      // Tạo bản ghi Payment thành công
      const paymentRecord = await tx.payment.create({
        data: {
          orderId: order.id,
          attemptNumber,
          idempotencyKey: key,
          paymentMethod: dto.paymentMethod,
          amount: current.totalAmount,
          status: PaymentStatus.SUCCESS,
          transactionCode: `PAY-${randomUUID().slice(0, 8).toUpperCase()}`,
          completedAt: new Date(),
        },
      });

      return { order: updatedOrder, payment: paymentRecord };
    });

    // Hủy đơn quá hạn phải commit trước khi trả lỗi.
    if ('expired' in txResult) {
      throw new ConflictException('Đơn đã hủy do quá hạn thanh toán 10 phút.');
    }

    return {
      replayed: false,
      orderId: txResult.order.id,
      orderNumber: txResult.order.orderNumber,
      status: txResult.order.status,
      totalAmount: txResult.order.totalAmount.toFixed(2),
      payment: {
        id: txResult.payment.id,
        method: txResult.payment.paymentMethod,
        status: txResult.payment.status,
        transactionCode: txResult.payment.transactionCode,
        amount: txResult.payment.amount.toFixed(2),
        completedAt: txResult.payment.completedAt,
      },
    };
  }
}
