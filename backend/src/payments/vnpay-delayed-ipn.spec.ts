import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { expireOrderInTransaction, ORDER_PAYMENT_EXPIRED } from '../orders/order-payment-window';
import { VnpayCallbackService } from './vnpay-callback.service';
import { VnpayService } from './vnpay.service';

describe('VNPay thanh toán đúng hạn nhưng IPN về trễ', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-08T01:10:03Z')); });
  afterEach(() => { jest.useRealTimers(); });

  function setup() {
    const order = { id: 'order-1', userId: 'user-1', status: OrderStatus.PENDING as OrderStatus,
      createdAt: new Date('2026-11-08T01:00:00Z'), voucherCode: null,
      items: [{ productId: 'product-1', quantity: 1 }] };
    const payment = { id: 'payment-1', orderId: order.id, provider: 'VNPAY',
      status: PaymentStatus.PENDING as PaymentStatus, amount: new Prisma.Decimal(50000),
      createdAt: new Date('2026-11-08T01:08:00Z'), expiresAt: new Date('2026-11-08T01:10:00Z'),
      errorCode: null as string | null, errorMessage: null as string | null };
    let anotherCollectedPayment = false;
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      order: {
        findUniqueOrThrow: jest.fn().mockImplementation(async () => ({ ...order })),
        update: jest.fn().mockImplementation(async ({ data }) => Object.assign(order, data)),
      },
      payment: {
        findUniqueOrThrow: jest.fn().mockImplementation(async () => ({ ...payment })),
        findFirst: jest.fn().mockImplementation(async () => anotherCollectedPayment ? { id: 'other-payment' } : null),
        updateMany: jest.fn().mockImplementation(async ({ data }) => { Object.assign(payment, data); return { count: 1 }; }),
        update: jest.fn().mockImplementation(async ({ data }) => Object.assign(payment, data)),
      },
      product: { findUnique: jest.fn().mockResolvedValue({ stock: 10, isAvailable: true }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { update: jest.fn().mockResolvedValue({}) },
      loyaltyTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { payment: { findUnique: jest.fn().mockImplementation(async () => ({ ...payment })) },
      $transaction: jest.fn().mockImplementation(callback => callback(tx)) };
    const gateway = { getMerchantCode: jest.fn().mockReturnValue('TESTCODE') };
    const result = { isVerified: true, isSuccess: true, message: 'Success', vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: payment.id, vnp_Amount: 50000, vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
      vnp_TransactionNo: '123456', vnp_PayDate: '20261108080958' as string | undefined };
    const service = new VnpayCallbackService(prisma as unknown as PrismaService, gateway as unknown as VnpayService);
    return { order, payment, tx, prisma, result, service,
      collectedElsewhere: () => { anotherCollectedPayment = true; },
      expire: () => expireOrderInTransaction(tx as unknown as Prisma.TransactionClient, order),
    };
  }

  it('trả tiền 09:58, IPN đến 10:03: xác nhận PAID thay vì tự hủy', async () => {
    const { service, result, order, payment, tx } = setup();
    expect((await service.confirmVerifiedPayment(result)).RspCode).toBe('00');
    expect(order.status).toBe(OrderStatus.PAID);
    expect(payment.status).toBe(PaymentStatus.SUCCESS);
    expect(payment.errorCode).toBeNull();
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ completedAt: new Date('2026-11-08T01:09:58Z') }),
    }));
  });

  it('tác vụ hết hạn chạy trước IPN: chỉ khôi phục đơn tự hủy, xử lý lặp đúng một lần', async () => {
    const { service, result, order, payment, tx, expire } = setup();
    expect(await expire()).toBe(true);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(payment.errorCode).toBe(ORDER_PAYMENT_EXPIRED);
    expect((await service.confirmVerifiedPayment(result)).RspCode).toBe('00');
    expect(order.status).toBe(OrderStatus.PAID);
    expect((await service.confirmVerifiedPayment(result)).RspCode).toBe('02');
    expect(await expire()).toBe(false);
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.user.update).toHaveBeenCalledTimes(1);
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledTimes(1);
  });

  it('không khôi phục đơn hủy vì lý do khác', async () => {
    const { service, result, order, payment, tx } = setup();
    order.status = OrderStatus.CANCELLED;
    await service.confirmVerifiedPayment(result);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(payment.errorCode).toBe('REFUND_REQUIRED');
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it.each(['20261108081000', '20261108081005'])('thanh toán thực sự từ lúc hết hạn %s vẫn cần hoàn tiền', async payDate => {
    const { service, result, order, payment, tx } = setup();
    result.vnp_PayDate = payDate;
    await service.confirmVerifiedPayment(result);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(payment.errorCode).toBe('REFUND_REQUIRED');
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('không phục hồi đơn nếu đã có giao dịch thu tiền khác', async () => {
    const { service, result, order, payment, tx, expire, collectedElsewhere } = setup();
    await expire();
    collectedElsewhere();
    await service.confirmVerifiedPayment(result);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(payment.errorCode).toBe('REFUND_REQUIRED');
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('không phục hồi đơn nếu không còn đủ tồn kho', async () => {
    const { service, result, order, payment, tx, expire } = setup();
    await expire();
    tx.product.findUnique.mockResolvedValue({ stock: 0, isAvailable: true });
    await service.confirmVerifiedPayment(result);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(payment.errorCode).toBe('REFUND_REQUIRED');
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('ngày thanh toán sai bị từ chối, không ghi DB', async () => {
    const { service, result, prisma } = setup();
    result.vnp_PayDate = '20260230080958';
    expect((await service.confirmVerifiedPayment(result)).RspCode).toBe('97');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('thiếu thời điểm thanh toán không đủ căn cứ khôi phục đơn đã hết hạn', async () => {
    const { service, result, order, payment, expire } = setup();
    await expire();
    result.vnp_PayDate = undefined;
    await service.confirmVerifiedPayment(result);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(payment.errorCode).toBe('REFUND_REQUIRED');
  });

  it('trạng thái chưa rõ không xóa dấu tự hủy trước khi IPN đúng hạn về', async () => {
    const { service, result, order, payment, expire } = setup();
    await expire();
    await service.confirmVerifiedPayment({ ...result, isSuccess: false, vnp_ResponseCode: '07', vnp_TransactionStatus: '07' });
    expect(payment.errorCode).toBe(ORDER_PAYMENT_EXPIRED);
    await service.confirmVerifiedPayment(result);
    expect(order.status).toBe(OrderStatus.PAID);
  });
});
