import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VnpayService } from './vnpay.service';
import { VnpayCallbackService } from './vnpay-callback.service';

describe('VNPay: kết quả xác minh dùng chung IPN/querydr', () => {
  it.each([OrderStatus.PENDING, OrderStatus.CANCELLED])('thu tiền sau hạn với đơn %s: giữ hủy, đánh dấu cần hoàn tiền', async status => {
    const payment = { id: 'payment-1', orderId: 'order-1', provider: 'VNPAY',
      status: PaymentStatus.PENDING, amount: new Prisma.Decimal(50000) };
    const order = { id: 'order-1', status, createdAt: new Date(0), items: [] };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      order: { findUniqueOrThrow: jest.fn().mockResolvedValue(order), update: jest.fn().mockResolvedValue({}) },
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(payment),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      product: { updateMany: jest.fn() }, user: { update: jest.fn() },
    };
    const prisma = { payment: { findUnique: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn().mockImplementation(callback => callback(tx)) };
    const gateway = { getMerchantCode: jest.fn().mockReturnValue('TESTCODE') };
    const service = new VnpayCallbackService(prisma as unknown as PrismaService, gateway as unknown as VnpayService);
    expect((await service.confirmVerifiedPayment({
      isVerified: true, isSuccess: true, message: 'Success', vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: payment.id, vnp_Amount: 50000, vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00', vnp_TransactionNo: '123456',
    })).RspCode).toBe('00');
    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentStatus.SUCCESS, errorCode: 'REFUND_REQUIRED' }),
    }));
    expect(tx.order.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: OrderStatus.PAID } }));
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('IPN thành công cập nhật payment và order đúng một lần dù VNPay gửi lại', async () => {
    const payment = { id: 'payment-1', orderId: 'order-1', provider: 'VNPAY',
      status: PaymentStatus.PENDING as PaymentStatus, amount: new Prisma.Decimal(50000) };
    const order = { id: 'order-1', userId: 'user-1', status: OrderStatus.PENDING as OrderStatus,
      createdAt: new Date(), voucherCode: 'BREW10', items: [{ productId: 'product-1', quantity: 1 }] };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      payment: {
        findUniqueOrThrow: jest.fn().mockImplementation(async () => ({ ...payment })),
        update: jest.fn().mockImplementation(async ({ data }) => Object.assign(payment, data)),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockImplementation(async () => ({ ...order })),
        update: jest.fn().mockImplementation(async ({ data }) => Object.assign(order, data)),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ isAvailable: true, stock: 10 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
      loyaltyTransaction: { create: jest.fn().mockResolvedValue({}) },
      voucher: {
        findUnique: jest.fn().mockResolvedValue({ id: 'voucher-1', usageLimit: 10, usedCount: 9 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      payment: { findUnique: jest.fn().mockImplementation(async () => ({ ...payment })) },
      $transaction: jest.fn().mockImplementation(callback => callback(tx)),
    };
    const result = { isVerified: true, isSuccess: true, message: 'Success', vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: payment.id, vnp_Amount: 50000, vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00', vnp_TransactionNo: '123456' };
    const gateway = { getMerchantCode: jest.fn().mockReturnValue('TESTCODE'),
      verifyIpn: jest.fn().mockReturnValue(result) };
    const service = new VnpayCallbackService(prisma as unknown as PrismaService, gateway as unknown as VnpayService);
    const query = { vnp_TxnRef: payment.id, vnp_TmnCode: 'TESTCODE', vnp_Amount: '5000000',
      vnp_ResponseCode: '00', vnp_SecureHash: 'signature-verified-by-gateway' };
    expect((await service.handleIpn(query)).RspCode).toBe('00');
    expect(order.status).toBe(OrderStatus.PAID);
    expect(payment.status).toBe(PaymentStatus.SUCCESS);
    expect((await service.handleIpn(query)).RspCode).toBe('02');
    expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.user.update).toHaveBeenCalledTimes(1);
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledTimes(1);
    expect(tx.voucher.update).toHaveBeenCalledTimes(1);
  });

  it('lỗi ghi điểm trả IPN 99 để thử lại, không xác nhận thành công hoặc đánh dấu hoàn tiền', async () => {
    const payment = { id: 'payment-1', orderId: 'order-1', provider: 'VNPAY',
      status: PaymentStatus.PENDING, amount: new Prisma.Decimal(50000) };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      payment: { findUniqueOrThrow: jest.fn().mockResolvedValue(payment), update: jest.fn() },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'order-1', userId: 'user-1',
          status: OrderStatus.PENDING, createdAt: new Date(), voucherCode: null,
          items: [{ productId: 'product-1', quantity: 1 }] }),
        update: jest.fn(),
      },
      product: { findUnique: jest.fn().mockResolvedValue({ stock: 10, version: 1, isAvailable: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { update: jest.fn().mockResolvedValue({}) },
      loyaltyTransaction: { create: jest.fn().mockRejectedValue(new Error('loyalty write failed')) },
    };
    const prisma = { payment: { findUnique: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn().mockImplementation(callback => callback(tx)) };
    const gateway = { getMerchantCode: jest.fn().mockReturnValue('TESTCODE') };
    const service = new VnpayCallbackService(prisma as unknown as PrismaService, gateway as unknown as VnpayService);
    const result = await service.confirmVerifiedPayment({ isVerified: true, isSuccess: true,
      message: 'Success', vnp_TmnCode: 'TESTCODE', vnp_TxnRef: payment.id, vnp_Amount: 50000,
      vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456' });
    expect(result.RspCode).toBe('99');
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it.each([false, true])('IPN lỗi của lượt cũ không đổi trạng thái lượt mới (lượt mới: %s)', async (hasNewer) => {
    const payment = { id: 'payment-1', orderId: 'order-1', provider: 'VNPAY',
      status: PaymentStatus.PENDING, attemptNumber: 1, amount: new Prisma.Decimal(50000) };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'order-1' }]),
      payment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(payment),
        findFirst: jest.fn().mockResolvedValue({ id: hasNewer ? 'payment-2' : payment.id }),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: payment.orderId, status: OrderStatus.PENDING, createdAt: new Date(), items: [] }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      payment: { findUnique: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn().mockImplementation(callback => callback(tx)),
    };
    const gateway = { getMerchantCode: jest.fn().mockReturnValue('TESTCODE') };
    const service = new VnpayCallbackService(prisma as unknown as PrismaService, gateway as unknown as VnpayService);
    const result = await service.confirmVerifiedPayment({
      isVerified: true, isSuccess: false, message: 'Failed', vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: payment.id, vnp_Amount: 50000, vnp_ResponseCode: '02',
      vnp_TransactionStatus: '02',
    });
    expect(result.RspCode).toBe('00');
    expect(tx.payment.update).toHaveBeenCalledTimes(1);
    expect(tx.order.update).toHaveBeenCalledTimes(hasNewer ? 0 : 1);
  });
});
