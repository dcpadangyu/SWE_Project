import type { Order, Payment } from '@prisma/client';
import { orderPaymentDeadline } from '../orders/order-payment-window';

/** VNPay gửi yyyyMMddHHmmss theo GMT+7, không phải múi giờ của máy chạy BE. */
export function parseVnpayPayDate(value: unknown): Date | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const input = String(value);
  if (!/^\d{14}$/.test(input)) return null;
  const parts = [input.slice(0, 4), input.slice(4, 6), input.slice(6, 8),
    input.slice(8, 10), input.slice(10, 12), input.slice(12, 14)].map(Number);
  const localTime = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  if (!Number.isFinite(localTime)) return null;
  // Round-trip để từ chối ngày không tồn tại như 30/02, giờ 25, phút 60.
  const roundTrip = new Date(localTime).toISOString().replace(/\D/g, '').slice(0, 14);
  return roundTrip === input ? new Date(localTime - 7 * 60 * 60 * 1000) : null;
}

export function isVnpayPaymentOnTime(
  paidAt: Date,
  order: Pick<Order, 'createdAt'>,
  payment: Pick<Payment, 'createdAt' | 'expiresAt'>,
): boolean {
  const expiresAt = Math.min(orderPaymentDeadline(order.createdAt).getTime(),
    payment.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY);
  // VNPay chỉ có độ chính xác giây; URL cũng được ký với hạn tới giây.
  const startsAt = Math.floor(payment.createdAt.getTime() / 1000) * 1000;
  const deadline = Math.floor(expiresAt / 1000) * 1000;
  return paidAt.getTime() >= startsAt && paidAt.getTime() < deadline;
}
