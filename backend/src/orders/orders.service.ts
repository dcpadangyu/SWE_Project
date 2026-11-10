import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderExpirationService } from './order-expiration.service';
import { orderPaymentDeadline } from './order-payment-window';
import { assertOrderTransition } from './order-state-machine';
import {
  assertStockAvailable,
  buildOrderLines,
  ProductForOrder,
} from './order-lines';
import { InventoryService } from '../inventory/inventory.service';

const orderWithItems = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    items: { orderBy: { id: 'asc' } },
    refundRequest: true,
  },
});
type OrderWithItems = Prisma.OrderGetPayload<typeof orderWithItems>;

export interface CreateOrderResult {
  /** true nếu đây là lần gửi lại cùng Idempotency-Key (trả lại đơn cũ, không tạo mới) */
  replayed: boolean;
  order: ReturnType<OrdersService['toResponse']>;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionsService?: PromotionsService,
    private readonly expirationService?: OrderExpirationService,
    private readonly inventoryService?: InventoryService,
  ) {}
  async create(
    userId: string,
    checkoutKey: string,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResult> {
    const existing = await this.findByKey(userId, checkoutKey);
    if (existing) {
      await this.expirationService?.expireOrder(existing.id, userId);
      const current = this.expirationService ? await this.findByKey(userId, checkoutKey) : existing;
      return { replayed: true, order: this.toResponse(current!) };
    }

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const productIds = [...new Set(dto.items.map((i) => i.productId))];
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });
        const productMap = new Map<string, ProductForOrder>(
          products.map((p) => [p.id, p]),
        );

        const lines = buildOrderLines(dto.items, productMap);
        assertStockAvailable(lines, productMap);

        const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
        let discountAmount = 0;
        let appliedVoucherCode: string | undefined = undefined;

        if (dto.voucherCode && dto.voucherCode.trim().length > 0) {
          const rawCode = dto.voucherCode.trim().toUpperCase();
          if (this.promotionsService) {
            const voucherResult = await this.promotionsService.applyVoucher({
              code: rawCode,
              orderValue: subtotal,
            });
            discountAmount = voucherResult.discountAmount;
            appliedVoucherCode = voucherResult.code;
          }
        }

        const totalAmount = Math.max(0, subtotal - discountAmount);

        return tx.order.create({
          data: {
            userId,
            checkoutKey,
            note: dto.note,
            subtotal,
            discountAmount,
            totalAmount,
            voucherCode: appliedVoucherCode,
            items: {
              create: lines.map((line) => ({
                productId: line.productId,
                productName: line.productName,
                size: line.size,
                quantity: line.quantity,
                selectedToppings:
                  line.selectedToppings as unknown as Prisma.InputJsonValue,
                unitPrice: line.unitPrice,
                subtotal: line.subtotal,
              })),
            },
          },
          include: orderWithItems.include,
        });
      });

      return { replayed: false, order: this.toResponse(order) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Hai request cùng khóa chạy song song: request đến sau vi phạm unique(checkoutKey)
        if (error.code === 'P2002') {
          const duplicate = await this.findByKey(userId, checkoutKey);
          if (duplicate) {
            return { replayed: true, order: this.toResponse(duplicate) };
          }
          throw new ConflictException(
            'Idempotency-Key này đã được sử dụng. Vui lòng tạo khóa mới.',
          );
        }
        if (
          ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code)
        ) {
          throw new ServiceUnavailableException(
            'Tạm thời không thể xử lý đơn hàng. Vui lòng thử lại sau.',
          );
        }
      }
      throw error;
    }
  }

  private findByKey(userId: string, checkoutKey: string) {
    return this.prisma.order.findFirst({
      where: { userId, checkoutKey },
      include: orderWithItems.include,
    });
  }

  /** Định dạng phản hồi: tiền trả về dạng chuỗi 2 chữ số thập phân, giống module Products. */
  toResponse(order: OrderWithItems) {
    const refund = (order as any).refundRequest;
    return {
      id: order.id,
      orderId: order.id,
      orderCode: `#${order.orderNumber}`,
      status: order.status,
      subtotal: order.subtotal.toFixed(2),
      discountAmount: order.discountAmount.toFixed(2),
      totalAmount: order.totalAmount.toFixed(2),
      voucherCode: order.voucherCode ?? undefined,
      note: order.note,
      createdAt: order.createdAt,
      paymentExpiresAt: orderPaymentDeadline(order.createdAt),
      refundRequest: refund
        ? {
            id: refund.id,
            status: refund.status,
            amount: Number(refund.amount).toFixed(2),
            reason: refund.reason,
            processedBy: refund.processedBy,
            processedAt: refund.processedAt,
          }
        : null,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        selectedToppings: item.selectedToppings,
        unitPrice: item.unitPrice.toFixed(2),
        subtotal: item.subtotal.toFixed(2),
      })),
    };
  }
  /** Lịch sử đơn của chính user, mới nhất lên đầu. */
  async findMyOrders(userId: string) {
    // Chỉ đọc lịch sử; tác vụ nền xử lý hết hạn để request không phải chờ từng transaction.
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderWithItems.include,
      orderBy: [{ createdAt: 'desc' }, { orderNumber: 'desc' }],
    });
    return orders.map((order) => this.toResponse(order));
  }

  /** Chi tiết một đơn. Chỉ chủ đơn xem được; đơn người khác trả 404. */
  async findOneForUser(userId: string, orderId: string) {
    await this.expirationService?.expireOrder(orderId, userId);
    // Lọc theo cả userId ngay trong truy vấn: đơn của người khác cũng trả 404
    // để không lộ id nào tồn tại. KHÔNG đổi thành findUnique({ id }) rồi so sánh sau.
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: orderWithItems.include,
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }
    return this.toResponse(order);
  }

  /** Cập nhật trạng thái đơn hàng (Dành cho Barista/Admin chuyển trạng thái pha chế hoặc hủy) */
  async updateStatus(orderId: string, targetStatus: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderWithItems.include,
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần cập nhật.');
    }

    assertOrderTransition(order.status, targetStatus);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: targetStatus },
      include: orderWithItems.include,
    });

    if (targetStatus === OrderStatus.PREPARING && this.inventoryService) {
      try {
        await this.inventoryService.deductIngredientsForOrder(
          this.prisma,
          orderId,
          'Nhân viên Pha chế',
        );
      } catch (_err) {
        // Không chặn cập nhật đơn hàng nếu trừ nguyên liệu gặp lỗi
      }
    }

    return this.toResponse(updated);
  }

  /**
   * Khách hàng yêu cầu hủy đơn hàng:
   * - Nếu PENDING: Hủy ngay lập tức.
   * - Nếu PAID: Tạo RefundRequest gửi thông báo đến Staff.
   * - Nếu PREPARING, READY, COMPLETED: Chặn hủy và ném ConflictException.
   */
  async cancelOrder(userId: string, orderId: string, reason?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: orderWithItems.include,
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần hủy.');
    }

    if (
      order.status === OrderStatus.PREPARING ||
      order.status === OrderStatus.READY ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new ConflictException(
        'Đồ uống đang được thực hiện hoặc đã hoàn thành, không thể hủy đơn lúc này.',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('Đơn hàng này đã được hủy trước đó.');
    }

    // Nếu đơn chưa thanh toán (PENDING hoặc PAYMENT_FAILED): Hủy ngay lập tức
    if (
      order.status === OrderStatus.PENDING ||
      order.status === OrderStatus.PAYMENT_FAILED
    ) {
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: orderWithItems.include,
      });

      return {
        success: true,
        message: 'Đã hủy đơn hàng thành công.',
        status: OrderStatus.CANCELLED,
        order: this.toResponse(updated),
      };
    }

    // Nếu đơn đã thanh toán (PAID): Tạo yêu cầu hoàn tiền cho Staff duyệt
    if (order.status === OrderStatus.PAID) {
      const existingRefund = await this.prisma.refundRequest.findUnique({
        where: { orderId },
      });

      if (existingRefund && existingRefund.status === 'PENDING') {
        return {
          success: true,
          message: 'Yêu cầu hoàn tiền của bạn đang chờ nhân viên quầy xử lý.',
          isRefundPending: true,
          status: OrderStatus.PAID,
          order: this.toResponse(order),
        };
      }

      await this.prisma.refundRequest.upsert({
        where: { orderId },
        create: {
          orderId,
          userId,
          amount: order.totalAmount,
          reason: reason || 'Khách hàng hủy đơn sau khi thanh toán',
          status: 'PENDING',
        },
        update: {
          reason: reason || 'Khách hàng hủy đơn sau khi thanh toán',
          status: 'PENDING',
        },
      });

      const updated = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: orderWithItems.include,
      });

      return {
        success: true,
        message: 'Đã gửi yêu cầu hủy đơn và hoàn tiền đến nhân viên quầy.',
        isRefundPending: true,
        status: OrderStatus.PAID,
        order: this.toResponse(updated!),
      };
    }

    throw new ConflictException('Trạng thái đơn hàng không hợp lệ để hủy.');
  }

  /**
   * Lấy toàn bộ danh sách đơn hàng cho Staff (Barista/Admin), kèm thông tin khách và refundRequest
   */
  async findStaffOrders() {
    const orders = await this.prisma.order.findMany({
      include: {
        items: { orderBy: { id: 'asc' } },
        refundRequest: true,
        user: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Lấy 100 đơn mới nhất
    });

    return orders.map((order) => {
      const resp = this.toResponse(order as any);
      return {
        ...resp,
        customer: {
          id: order.user.id,
          email: order.user.email,
          fullName: order.user.fullName || 'Khách hàng',
        },
      };
    });
  }

  /**
   * Nhân viên chấp nhận duyệt hoàn tiền cho đơn hàng
   */
  async approveRefund(orderId: string, staffEmail: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!refund) {
      throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền cho đơn hàng này.');
    }

    if (refund.status !== 'PENDING') {
      throw new ConflictException('Yêu cầu hoàn tiền này đã được xử lý trước đó.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật RefundRequest
      await tx.refundRequest.update({
        where: { orderId },
        data: {
          status: 'APPROVED',
          processedBy: staffEmail,
          processedAt: new Date(),
        },
      });

      // 2. Chuyển trạng thái Order sang CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: orderWithItems.include,
      });

      return {
        success: true,
        message: 'Đã chấp nhận hoàn tiền và hủy đơn hàng thành công.',
        order: this.toResponse(updatedOrder),
      };
    });
  }
}
