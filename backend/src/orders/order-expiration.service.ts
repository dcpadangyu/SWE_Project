import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { expireOrderInTransaction, ORDER_PAYMENT_WINDOW_MS } from './order-payment-window';

@Injectable()
export class OrderExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpirationService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.sweep();
    this.timer = setInterval(() => { void this.sweep(); }, 15000);
    this.timer.unref();
  }

  onModuleDestroy() { clearInterval(this.timer); }

  private async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      await this.expireDueOrders();
    } catch {
      this.logger.error('Chưa hủy được đơn quá hạn; sẽ thử lại ở lượt quét sau.');
    } finally {
      this.running = false;
    }
  }

  async expireOrder(orderId: string, userId?: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { id: orderId, ...(userId ? { userId } : {}) } });
      return order ? expireOrderInTransaction(tx, order) : false;
    });
  }

  async expireDueOrders(userId?: string) {
    const due = await this.prisma.order.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] },
        createdAt: { lte: new Date(Date.now() - ORDER_PAYMENT_WINDOW_MS) },
        payments: { none: { status: { in: ['SUCCESS', 'REFUNDED'] } } },
      },
      select: { id: true }, orderBy: { createdAt: 'asc' }, take: 100,
    });
    for (const order of due) await this.expireOrder(order.id, userId);
  }
}
