import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

export const ALLOWED_ORDER_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransitionOrder(
  current: OrderStatus,
  target: OrderStatus,
): boolean {
  return ALLOWED_ORDER_TRANSITIONS[current]?.includes(target) ?? false;
}

export function assertOrderTransition(
  current: OrderStatus,
  target: OrderStatus,
): void {
  if (!canTransitionOrder(current, target)) {
    throw new ConflictException(
      `Không thể chuyển đơn hàng từ ${current} sang ${target}.`,
    );
  }
}
