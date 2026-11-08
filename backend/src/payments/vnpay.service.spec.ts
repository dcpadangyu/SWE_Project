import { createHmac } from 'node:crypto';
import { VnpayService } from './vnpay.service';

describe('VNPay SDK contract', () => {
  const configNames = ['VNPAY_TEST_MODE', 'VNPAY_HOST', 'VNPAY_QUERY_HOST', 'VNPAY_RETURN_URL'] as const;
  const previousConfig = Object.fromEntries(configNames.map(name => [name, process.env[name]]));
  const previous = { tmn: process.env.VNPAY_TMN_CODE, secret: process.env.VNPAY_HASH_SECRET };
  beforeEach(() => {
    for (const name of configNames) delete process.env[name];
    process.env.VNPAY_RETURN_URL = 'https://backend.example/payments/vnpay/return';
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'unit-test-secret';
  });
  afterEach(() => {
    for (const name of configNames) {
      if (previousConfig[name] === undefined) delete process.env[name];
      else process.env[name] = previousConfig[name];
    }
    jest.restoreAllMocks();
    if (previous.tmn === undefined) delete process.env.VNPAY_TMN_CODE;
    else process.env.VNPAY_TMN_CODE = previous.tmn;
    if (previous.secret === undefined) delete process.env.VNPAY_HASH_SECRET;
    else process.env.VNPAY_HASH_SECRET = previous.secret;
  });

  const input = { paymentId: 'payment-1', orderNumber: 1, amount: 50000,
    ipAddress: '127.0.0.1', createdAt: new Date('2026-11-08T01:00:00Z'),
    expiresAt: new Date('2026-11-08T01:10:00Z') };

  it('mặc định dùng sandbox khi chưa cấu hình mode/host', () => {
    expect(new URL(new VnpayService().buildPaymentUrl(input)).origin)
      .toBe('https://sandbox.vnpayment.vn');
  });

  it.each([undefined, 'https://query.example'])(
    'host thanh toán và querydr tuân theo cấu hình (query host: %s)', async queryHost => {
      process.env.VNPAY_TEST_MODE = 'false';
      process.env.VNPAY_HOST = 'https://gateway.example';
      if (queryHost) process.env.VNPAY_QUERY_HOST = queryHost;
      const service = new VnpayService();
      expect(new URL(service.buildPaymentUrl(input)).origin).toBe('https://gateway.example');
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ vnp_ResponseCode: '99' })),
      );
      await service.queryPayment({ id: 'payment-1', createdAt: input.createdAt }, '127.0.0.1');
      const requestUrl = fetchMock.mock.calls[0][0];
      expect(new URL(requestUrl instanceof Request ? requestUrl.url : requestUrl).origin)
        .toBe(queryHost ?? 'https://gateway.example');
    },
  );

  it.each([
    { VNPAY_TEST_MODE: 'invalid' },
    { VNPAY_TEST_MODE: 'false' },
    { VNPAY_HOST: 'https://gateway.example' },
    { VNPAY_QUERY_HOST: 'https://query.example' },
    { VNPAY_TEST_MODE: 'false', VNPAY_HOST: 'http://gateway.example' },
    { VNPAY_TEST_MODE: 'false', VNPAY_HOST: 'https://user@gateway.example' },
    { VNPAY_TEST_MODE: 'false', VNPAY_HOST: 'https://gateway.example/path' },
  ])('từ chối cấu hình sai thay vì âm thầm dùng sandbox: %j', config => {
    Object.assign(process.env, config);
    expect(() => new VnpayService().buildPaymentUrl(input)).toThrow();
  });

  it.each([false, true])('vnp_PayDate được bảo vệ bằng chữ ký IPN (bị sửa: %s)', tampered => {
    const query = {
      vnp_TmnCode: 'TESTCODE', vnp_TxnRef: 'payment-1', vnp_Amount: '5000000',
      vnp_OrderInfo: 'Test-payment',
      vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456',
      vnp_PayDate: '20261108080958',
    };
    const data = new URLSearchParams(Object.entries(query).sort(([a], [b]) => a.localeCompare(b))).toString();
    const signature = createHmac('sha512', 'unit-test-secret').update(data).digest('hex');
    const result = new VnpayService().verifyIpn({ ...query,
      vnp_Amount: 5000000,
      vnp_PayDate: tampered ? '20261108080900' : query.vnp_PayDate,
      vnp_SecureHash: signature,
    });
    expect(result.isVerified).toBe(!tampered);
    if (!tampered) expect(String(result.vnp_PayDate)).toBe(query.vnp_PayDate);
  });

  it.each([false, true])('kiểm tra chữ ký response querydr (bị sửa: %s)', async (tampered) => {
    const response = {
      vnp_ResponseId: 'response-1', vnp_Command: 'querydr', vnp_ResponseCode: '00',
      vnp_Message: 'Success', vnp_TmnCode: 'TESTCODE', vnp_TxnRef: 'payment-1',
      vnp_Amount: '5000000', vnp_BankCode: 'NCB', vnp_PayDate: '20261106100100',
      vnp_TransactionNo: '123456', vnp_TransactionType: '01', vnp_TransactionStatus: '02',
      vnp_OrderInfo: 'Test payment', vnp_PromotionCode: '', vnp_PromotionAmount: '',
    };
    const signature = createHmac('sha512', 'unit-test-secret')
      .update(Object.values(response).join('|')).digest('hex');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      ...response, vnp_SecureHash: tampered ? 'invalid' : signature,
    })));
    const result = await new VnpayService().queryPayment({
      id: 'payment-1', createdAt: new Date('2026-11-06T03:00:00Z'),
    }, '127.0.0.1');
    expect(result.isVerified).toBe(!tampered);
    // SDK querydr không chia 100 như API verifyIpnCall.
    expect(Number(result.vnp_Amount)).toBe(5000000);
    const request = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(request.vnp_TransactionDate).toBe(20261106100000);
    expect(request).not.toHaveProperty('vnp_TransactionNo');
    expect(request.vnp_RequestId).toMatch(/^[a-f0-9]{32}$/);
  });
});
