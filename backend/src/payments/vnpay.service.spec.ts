import { createHmac } from 'node:crypto';
import { VnpayService } from './vnpay.service';

describe('VNPay querydr SDK contract', () => {
  const previous = { tmn: process.env.VNPAY_TMN_CODE, secret: process.env.VNPAY_HASH_SECRET };
  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'unit-test-secret';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (previous.tmn === undefined) delete process.env.VNPAY_TMN_CODE;
    else process.env.VNPAY_TMN_CODE = previous.tmn;
    if (previous.secret === undefined) delete process.env.VNPAY_HASH_SECRET;
    else process.env.VNPAY_HASH_SECRET = previous.secret;
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
