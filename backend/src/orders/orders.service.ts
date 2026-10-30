import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  assertStockAvailable,
  buildOrderLines,
  ProductForOrder,
} from './order-lines';

const orderWithItems = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: { items: { orderBy: { id: 'asc' } } },
});
type OrderWithItems = Prisma.OrderGetPayload<typeof orderWithItems>;

export interface CreateOrderResult {
  /** true nếu đây là lần gửi lại cùng Idempotency-Key (trả lại đơn cũ, không tạo mới) */
  replayed: boolean;
  order: ReturnType<OrdersService['toResponse']>;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo đơn hàng PENDING từ giỏ hàng (FR-12).
   *
   * - Gửi lại cùng (userId, checkoutKey): trả lại đơn cũ, không tạo đơn thứ hai.
   * - Giá, thành tiền, tổng tiền do backend tự tính từ DB (AC-12.3).
   * - Kiểm tra tồn kho nhưng KHÔNG trừ kho (chỉ trừ khi thanh toán thành công).
   * - Toàn bộ trong một transaction: lỗi ở bất kỳ món nào thì không có đơn nào được lưu (AC-12.5).
   */
  async create(
    userId: string,
    checkoutKey: string,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResult> {
    const existing = await this.findByKey(userId, checkoutKey);
    if (existing) {
      return { replayed: true, order: this.toResponse(existing) };
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
        const discountAmount = 0; // Voucher thuộc Task 10
        const totalAmount = subtotal - discountAmount;

        return tx.order.create({
          data: {
            userId,
            checkoutKey,
            note: dto.note,
            subtotal,
            discountAmount,
            totalAmount,
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
        if (['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code)) {
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
    return {
      orderId: order.id,
      orderCode: `#${order.orderNumber}`,
      status: order.status,
      subtotal: order.subtotal.toFixed(2),
      discountAmount: order.discountAmount.toFixed(2),
      totalAmount: order.totalAmount.toFixed(2),
      note: order.note,
      createdAt: order.createdAt,
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
}
