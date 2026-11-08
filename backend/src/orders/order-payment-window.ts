import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import type { Order } from '@prisma/client';
import { assertOrderTransition } from './order-state-machine';

export const ORDER_PAYMENT_WINDOW_MS = 10 * 60 * 1000;
export const ORDER_PAYMENT_EXPIRED = 'ORDER_PAYMENT_EXPIRED';

export function orderPaymentDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + ORDER_PAYMENT_WINDOW_MS);
}

// Caller phải khóa hàng order trước khi gọi để đồng bộ với tạo payment và IPN.
export async function expireOrderInTransaction(
  tx: Prisma.TransactionClient,
  order: Pick<Order, 'id' | 'status' | 'createdAt'>,
  now = new Date(),
): Promise<boolean> {
  if ((order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_FAILED) ||
    orderPaymentDeadline(order.createdAt).getTime() > now.getTime()) return false;

  const collected = await tx.payment.findFirst({
    where: { orderId: order.id, status: { in: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED] } },
    select: { id: true },
  });
  if (collected) return false;

  assertOrderTransition(order.status, OrderStatus.CANCELLED);
  await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
  // Hết hạn đơn không chứng minh ngân hàng chưa thu tiền. Giữ payment để đối soát.
  await tx.payment.updateMany({
    where: { orderId: order.id, status: PaymentStatus.PENDING },
    data: { errorCode: ORDER_PAYMENT_EXPIRED, errorMessage: 'Đơn đã hủy do quá hạn thanh toán 10 phút.' },
  });
  return true;
}
