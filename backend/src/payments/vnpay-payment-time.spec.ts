import { isVnpayPaymentOnTime, parseVnpayPayDate } from './vnpay-payment-time';

describe('Thời điểm thanh toán VNPay', () => {
  it('đọc GMT+7 độc lập múi giờ máy chủ', () => {
    expect(parseVnpayPayDate('20261108080958')).toEqual(new Date('2026-11-08T01:09:58Z'));
    expect(parseVnpayPayDate(20261108080958)).toEqual(new Date('2026-11-08T01:09:58Z'));
  });

  it.each([undefined, null, '', '20260230080000', '20261301080000', '20261108250000',
    '20261108086000', '20261108080060', '2026-11-08', 'not-a-date'])('từ chối ngày không hợp lệ: %s', value => {
    expect(parseVnpayPayDate(value)).toBeNull();
  });

  const order = { createdAt: new Date('2026-11-08T01:00:00.500Z') };
  const payment = { createdAt: new Date('2026-11-08T01:09:00.700Z'), expiresAt: new Date('2026-11-08T01:10:00.500Z') };

  it('chấp nhận thanh toán cùng giây tạo payment và trước hạn tới giây', () => {
    expect(isVnpayPaymentOnTime(new Date('2026-11-08T01:09:00Z'), order, payment)).toBe(true);
    expect(isVnpayPaymentOnTime(new Date('2026-11-08T01:09:59Z'), order, payment)).toBe(true);
  });

  it('không chấp nhận trước khi tạo lượt thanh toán hoặc từ giây hết hạn', () => {
    expect(isVnpayPaymentOnTime(new Date('2026-11-08T01:08:59Z'), order, payment)).toBe(false);
    expect(isVnpayPaymentOnTime(new Date('2026-11-08T01:10:00Z'), order, payment)).toBe(false);
    expect(isVnpayPaymentOnTime(new Date('2026-11-08T01:10:03Z'), order, payment)).toBe(false);
  });

  it('không kéo dài hạn đơn nếu payment cũ được tạo với URL 15 phút', () => {
    expect(isVnpayPaymentOnTime(new Date('2026-11-08T01:11:00Z'), order,
      { ...payment, expiresAt: new Date('2026-11-08T01:15:00Z') })).toBe(false);
  });
});
