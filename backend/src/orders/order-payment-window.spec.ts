import { OrderStatus, PaymentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { expireOrderInTransaction, orderPaymentDeadline } from './order-payment-window';

describe('Hạn thanh toán đơn hàng 10 phút', () => {
  const createdAt = new Date('2026-11-07T01:00:00Z');
  const deadline = new Date('2026-11-07T01:10:00Z');

  function setup(status: OrderStatus = OrderStatus.PENDING) {
    const order = { id: 'order-1', status, createdAt };
    const tx = {
      payment: { findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: { update: jest.fn().mockResolvedValue({}) },
    };
    return { order, tx, expire: (now = deadline) => expireOrderInTransaction(tx as unknown as Prisma.TransactionClient, order, now) };
  }

  it('chưa đủ 10 phút thì giữ nguyên đơn', async () => {
    const { expire, tx } = setup();
    expect(orderPaymentDeadline(createdAt)).toEqual(deadline);
    expect(await expire(new Date(deadline.getTime() - 1))).toBe(false);
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it.each([OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED])('đủ 10 phút hủy đơn %s nhưng không giả định payment FAILED', async status => {
    const { expire, tx } = setup(status);
    expect(await expire()).toBe(true);
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { status: OrderStatus.CANCELLED } });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1', status: PaymentStatus.PENDING },
      data: expect.objectContaining({ errorCode: 'ORDER_PAYMENT_EXPIRED' }),
    });
    expect(tx.payment.updateMany.mock.calls[0][0].data).not.toHaveProperty('status');
  });

  it.each([OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED])('không hủy lại đơn %s', async status => {
    const { expire, tx } = setup(status);
    expect(await expire()).toBe(false);
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('payment đã ghi nhận tiền thì không hủy dù order chưa đồng bộ', async () => {
    const { expire, tx } = setup();
    tx.payment.findFirst.mockResolvedValue({ id: 'collected-payment' });
    expect(await expire()).toBe(false);
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
