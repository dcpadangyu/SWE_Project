import type { PaymentProvider } from '../types/brewlite';
import { ApiError, apiClient } from './apiClient';
import { startVnpayPayment } from './startVnpayPayment';

export async function startPayment(
  provider: PaymentProvider,
  orderId: string,
  key: string,
  saveKey: (key: string) => void,
  simulateFailure = false,
) {
  if (provider === 'VNPAY') return startVnpayPayment(orderId, key, saveKey);
  if (provider !== 'MOCK') throw new Error('Chế độ thanh toán không hợp lệ.');
  try {
    const result = await apiClient.post<{ orderId: string; status: string }>('/payments', {
      orderId,
      paymentMethod: 'BANK_CARD',
      simulateFailure,
    }, { headers: { 'Idempotency-Key': key }, handledError: true });
    if (result.orderId !== orderId || !['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(result.status)) {
      throw new Error('Chưa xác nhận thanh toán. Hãy kiểm tra trạng thái đơn hàng.');
    }
    return { kind: 'order' as const, orderId };
  } catch (error) {
    // Chỉ đổi khóa sau thất bại đã xác nhận; lỗi mạng giữ khóa để phát lại an toàn.
    if (error instanceof ApiError && error.status === 402) saveKey(crypto.randomUUID());
    throw error;
  }
}
