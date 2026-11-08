import type { PaymentProvider } from '../types/brewlite';
import { apiClient } from './apiClient';

export async function getPaymentProvider(signal?: AbortSignal): Promise<PaymentProvider> {
  const config = await apiClient.get<{ provider: unknown }>('/payments/config', {
    cache: 'no-store', signal, handledError: true,
  });
  if (config.provider !== 'MOCK' && config.provider !== 'VNPAY') {
    throw new Error('Chế độ thanh toán không hợp lệ. Vui lòng thử tải lại trang.');
  }
  return config.provider;
}
