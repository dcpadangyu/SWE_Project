import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentConfiguration, PaymentConfigurationController } from './payment-configuration';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VnpayController } from './vnpay.controller';
import { VnpayCheckoutService } from './vnpay-checkout.service';
import { VnpayCallbackService } from './vnpay-callback.service';
import { VnpayReconciliationService } from './vnpay-reconciliation.service';

describe('Cấu hình và phân luồng API thanh toán', () => {
  const previous = { provider: process.env.PAYMENT_PROVIDER, nodeEnv: process.env.NODE_ENV };
  let app: INestApplication;
  const mockPay = jest.fn().mockResolvedValue({ replayed: false, orderId: 'order-1', status: 'PAID' });
  const vnpayCreate = jest.fn().mockResolvedValue({ paymentUrl: 'https://sandbox.vnpayment.vn/payment' });
  const callback = { handleIpn: jest.fn().mockResolvedValue({ RspCode: '00' }),
    getReturnUrl: jest.fn().mockResolvedValue('http://localhost:3000/orders/order-1') };
  const reconcile = jest.fn().mockResolvedValue({ status: 'PAID' });

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.PAYMENT_PROVIDER;
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [PaymentConfigurationController, PaymentsController, VnpayController],
      providers: [PaymentConfiguration,
        { provide: PaymentsService, useValue: { processPayment: mockPay } },
        { provide: VnpayCheckoutService, useValue: { createPayment: vnpayCreate } },
        { provide: VnpayCallbackService, useValue: callback },
        { provide: VnpayReconciliationService, useValue: { reconcileOrder: reconcile } },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 'user-1' };
      return req.headers.authorization === 'Bearer test';
    } }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    if (previous.provider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = previous.provider;
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
  });

  it('mặc định Mock, config công khai chỉ trả provider và không cache', async () => {
    const result = await request(app.getHttpServer()).get('/payments/config').expect(200);
    expect(result.body).toEqual({ provider: 'MOCK' });
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it.each(['MOCK', 'VNPAY'])('chế độ %s chỉ cho phép mở giao dịch đúng provider', async provider => {
    process.env.PAYMENT_PROVIDER = provider;
    await request(app.getHttpServer()).post('/payments').set('Authorization', 'Bearer test')
      .set('Idempotency-Key', 'key-1').send({ orderId: 'order-1', paymentMethod: 'BANK_CARD' })
      .expect(provider === 'MOCK' ? 200 : 403);
    await request(app.getHttpServer()).post('/payments/vnpay/create').set('Authorization', 'Bearer test')
      .set('Idempotency-Key', 'key-1').send({ orderId: 'order-1' })
      .expect(provider === 'VNPAY' ? 200 : 403);
    expect(mockPay).toHaveBeenCalledTimes(provider === 'MOCK' ? 1 : 0);
    expect(vnpayCreate).toHaveBeenCalledTimes(provider === 'VNPAY' ? 1 : 0);
  });

  it('Mock vẫn nhận IPN, return và đối soát các giao dịch VNPay đã mở', async () => {
    await request(app.getHttpServer()).get('/payments/vnpay/ipn').expect(200);
    await request(app.getHttpServer()).get('/payments/vnpay/return').expect(302);
    await request(app.getHttpServer()).post('/payments/vnpay/reconcile')
      .set('Authorization', 'Bearer test').send({ orderId: 'order-1' }).expect(200);
    expect(callback.handleIpn).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it.each(['TYPO', 'vnpay'])('provider sai %s chặn cả hai API, không tự rơi về Mock', async provider => {
    process.env.PAYMENT_PROVIDER = provider;
    await request(app.getHttpServer()).get('/payments/config').expect(503);
    for (const path of ['/payments', '/payments/vnpay/create']) {
      await request(app.getHttpServer()).post(path).set('Authorization', 'Bearer test').send({}).expect(503);
    }
    expect(mockPay).not.toHaveBeenCalled();
    expect(vnpayCreate).not.toHaveBeenCalled();
  });

  it('production không cho phép Mock hoặc provider mặc định', () => {
    process.env.NODE_ENV = 'production';
    const config = new PaymentConfiguration();
    expect(() => config.onModuleInit()).toThrow('production');
    process.env.PAYMENT_PROVIDER = 'MOCK';
    expect(() => config.onModuleInit()).toThrow('production');
    process.env.PAYMENT_PROVIDER = 'VNPAY';
    expect(() => config.onModuleInit()).not.toThrow();
  });
});
