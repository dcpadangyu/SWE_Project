import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VnpayCheckoutService } from './vnpay-checkout.service';
import { VnpayService } from './vnpay.service';

describe('VNPay: quay lại thanh toán', () => {
  const order = {
    id: 'order-1',
    orderNumber: 'BL-001',
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    totalAmount: new Prisma.Decimal(50000),
  };
  const pending = {
    id: 'payment-1',
    orderId: order.id,
    provider: 'VNPAY',
    status: PaymentStatus.PENDING,
    amount: new Prisma.Decimal(50000),
    errorCode: null,
    paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?existing=1',
    expiresAt: new Date(Date.now() + 900000),
  };

  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: order.id }]),
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...order }),
        update: jest.fn().mockResolvedValue({ ...order }),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ ...pending }]),
        findUnique: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _max: { attemptNumber: 1 } }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const gateway = { buildPaymentUrl: jest.fn().mockReturnValue(pending.paymentUrl) };
    const service = new VnpayCheckoutService(
      prisma as unknown as PrismaService,
      gateway as unknown as VnpayService,
    );
    const request = (key = 'new-browser-key') =>
      service.createPayment('owner-1', key, { orderId: order.id }, '127.0.0.1');
    return { tx, gateway, request };
  }

  it.each([false, true])('dùng lại payment với khóa cũ hoặc mới (khóa cũ: %s)', async (sameKey) => {
    const { tx, gateway, request } = setup();
    if (sameKey) tx.payment.findUnique.mockResolvedValue({ ...pending });
    await expect(request()).resolves.toMatchObject({
      replayed: true,
      paymentId: pending.id,
      paymentUrl: pending.paymentUrl,
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(gateway.buildPaymentUrl).not.toHaveBeenCalled();
  });

  it.each([
    { expiresAt: new Date(0) },
    { errorCode: 'RECONCILIATION_REQUIRED' },
    { provider: 'MOCK' },
    { amount: new Prisma.Decimal(10000) },
    { status: PaymentStatus.SUCCESS },
  ])('chặn giao dịch không thể mở lại an toàn: %j', async (change) => {
    const { tx, request } = setup();
    tx.payment.findMany.mockResolvedValue([{ ...pending, ...change }]);
    await expect(request()).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('chặn nhiều giao dịch chờ ngay cả khi dùng đúng khóa cũ', async () => {
    const { tx, request } = setup();
    tx.payment.findMany.mockResolvedValue([pending, { ...pending, id: 'payment-2' }]);
    tx.payment.findUnique.mockResolvedValue(pending);
    await expect(request()).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('không trả URL khi đơn không thuộc người gọi', async () => {
    const { tx, request } = setup();
    tx.$queryRaw.mockResolvedValue([]);
    await expect(request()).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.payment.findMany).not.toHaveBeenCalled();
  });

  it('cho phép lượt mới sau khi thất bại đã được xác nhận', async () => {
    const { tx, gateway, request } = setup();
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, status: OrderStatus.PAYMENT_FAILED });
    tx.payment.findMany.mockResolvedValue([]);
    await expect(request()).resolves.toMatchObject({ replayed: false, orderId: order.id });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: order.id }, data: { status: OrderStatus.PENDING },
    });
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
    expect(tx.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ attemptNumber: 2 }) });
    expect(gateway.buildPaymentUrl).toHaveBeenCalledTimes(1);
  });

  it('URL mới hết hạn cùng đơn, không được thêm 10 phút cho mỗi lần thử', async () => {
    const { tx, gateway, request } = setup();
    const createdAt = new Date(Date.now() - 5 * 60000);
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, createdAt });
    tx.payment.findMany.mockResolvedValue([]);
    await request();
    expect(gateway.buildPaymentUrl).toHaveBeenCalledWith(expect.objectContaining({
      expiresAt: new Date(createdAt.getTime() + 10 * 60000),
    }));
  });

  it('đơn quá 10 phút: commit CANCELLED trước khi trả lỗi, không tạo payment', async () => {
    const { tx, request } = setup();
    tx.order.findUniqueOrThrow.mockResolvedValue({ ...order, createdAt: new Date(0) });
    tx.payment.findFirst = jest.fn().mockResolvedValue(null);
    tx.payment.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    await expect(request()).rejects.toThrow('Đơn đã hủy do quá hạn thanh toán 10 phút.');
    expect(tx.order.update).toHaveBeenCalledWith({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});
