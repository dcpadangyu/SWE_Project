import { NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VnpayService } from './vnpay.service';
import { VnpayCallbackService } from './vnpay-callback.service';
import { VnpayReconciliationService } from './vnpay-reconciliation.service';

describe('VNPay: xác minh URL hết hạn', () => {
  function setup() {
    const payment = {
      id: 'payment-1', provider: 'VNPAY', attemptNumber: 1,
      status: PaymentStatus.PENDING as PaymentStatus,
      amount: new Prisma.Decimal(50000), expiresAt: new Date(0),
      paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', errorCode: null,
    };
    const order = {
      id: 'order-1', status: OrderStatus.PENDING as OrderStatus,
      totalAmount: new Prisma.Decimal(50000), payments: [payment],
    };
    const response = {
      isVerified: true, isSuccess: true, vnp_ResponseCode: '00',
      vnp_Command: 'querydr', vnp_TxnRef: payment.id, vnp_Amount: 5000000,
      vnp_TransactionStatus: '02', vnp_TransactionType: '01', vnp_TransactionNo: '123456',
    };
    const prisma = { order: { findFirst: jest.fn().mockResolvedValue(order) } };
    const gateway = {
      queryPayment: jest.fn().mockResolvedValue(response),
      getMerchantCode: jest.fn().mockReturnValue('TESTCODE'),
    };
    const callback = { confirmVerifiedPayment: jest.fn().mockImplementation(result => {
      order.status = result.isSuccess ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED;
      payment.status = result.isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
      return Promise.resolve({ RspCode: '00', Message: 'Confirm Success' });
    }) };
    const service = new VnpayReconciliationService(
      prisma as unknown as PrismaService, gateway as unknown as VnpayService,
      callback as unknown as VnpayCallbackService,
    );
    return { payment, order, response, prisma, gateway, callback,
      request: () => service.reconcileOrder('owner-1', order.id, '127.0.0.1') };
  }

  it('xác nhận thất bại rồi mới cho phép thử lại', async () => {
    const { request, callback } = setup();
    await expect(request()).resolves.toMatchObject({ status: 'PAYMENT_FAILED', canPay: true });
    expect(callback.confirmVerifiedPayment).toHaveBeenCalledWith(expect.objectContaining({
      vnp_Amount: 50000, vnp_ResponseCode: '02', vnp_TransactionStatus: '02', isSuccess: false,
    }));
  });

  it('đã thu tiền thì cập nhật PAID và không cho thanh toán lại', async () => {
    const { request, response, callback } = setup();
    response.vnp_TransactionStatus = '00';
    await expect(request()).resolves.toMatchObject({ status: 'PAID', canPay: false });
    expect(callback.confirmVerifiedPayment).toHaveBeenCalledWith(expect.objectContaining({
      vnp_Amount: 50000, vnp_ResponseCode: '00', isSuccess: true,
    }));
  });

  it.each([
    { isVerified: false }, { vnp_TxnRef: 'other-payment' }, { vnp_Amount: 50000 },
    { vnp_Command: 'refund' }, { vnp_TransactionType: '02' },
    { vnp_TransactionStatus: '01' }, { vnp_TransactionStatus: '04' },
    { vnp_TransactionStatus: '07' }, { vnp_ResponseCode: '91' },
    { vnp_ResponseCode: '94' }, { vnp_ResponseCode: '97' },
  ])('không tự đóng giao dịch chưa xác minh được: %j', async (change) => {
    const { request, response, callback } = setup();
    Object.assign(response, change);
    await expect(request()).resolves.toMatchObject({ status: 'PENDING', canPay: false });
    expect(callback.confirmVerifiedPayment).not.toHaveBeenCalled();
  });

  it('không gọi VNPay với đơn không thuộc người dùng', async () => {
    const { request, prisma, gateway } = setup();
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(request()).rejects.toBeInstanceOf(NotFoundException);
    expect(gateway.queryPayment).not.toHaveBeenCalled();
  });

  it('lỗi mạng giữ nguyên PENDING và chặn lượt thu tiền mới', async () => {
    const { request, gateway, callback } = setup();
    gateway.queryPayment.mockRejectedValue(new Error('timeout'));
    await expect(request()).resolves.toMatchObject({ status: 'PENDING', canPay: false });
    expect(callback.confirmVerifiedPayment).not.toHaveBeenCalled();
  });

  it('đọc lại PAID khi IPN về trong lúc query thất bại', async () => {
    const { request, gateway, order, payment } = setup();
    gateway.queryPayment.mockImplementation(async () => {
      order.status = OrderStatus.PAID;
      payment.status = PaymentStatus.SUCCESS;
      throw new Error('timeout');
    });
    await expect(request()).resolves.toMatchObject({ status: 'PAID', canPay: false });
  });
});
