import { ApiError, apiClient } from './apiClient';
import { reconcileVnpayOrder } from './vnpayReconciliation';

type PaymentResponse = { orderId: string; paymentUrl: string };
type PaymentDestination =
  | { kind: 'payment'; url: string }
  | { kind: 'order'; orderId: string };

export async function startVnpayPayment(
  orderId: string,
  paymentKey: string,
  saveKey: (key: string) => void,
): Promise<PaymentDestination> {
  const create = (key: string) => apiClient.post<PaymentResponse>(
    '/payments/vnpay/create', { orderId },
    { headers: { 'Idempotency-Key': key }, handledError: true },
  );

  let payment: PaymentResponse;
  try {
    // Luồng tạo thanh toán giống Swagger. URL còn hạn được BE dùng lại.
    payment = await create(paymentKey);
  } catch (error: unknown) {
    if (!(error instanceof ApiError) || error.status !== 409) throw error;

    // Chỉ đối soát khi BE chặn lượt cũ; lỗi tra cứu không cản đơn mới.
    const current = await reconcileVnpayOrder(orderId);
    if (!['PENDING', 'PAYMENT_FAILED'].includes(current.status)) {
      return { kind: 'order', orderId };
    }
    if (!current.canPay) throw new Error(current.message);

    const retryKey = crypto.randomUUID();
    // Ghi trước request để mất response vẫn gửi lại đúng khóa.
    saveKey(retryKey);
    payment = await create(retryKey);
  }

  const destination = new URL(payment.paymentUrl);
  if (payment.orderId !== orderId || destination.protocol !== 'https:' ||
    destination.hostname !== 'sandbox.vnpayment.vn') {
    throw new Error('Địa chỉ cổng thanh toán không hợp lệ. Hãy kiểm tra lại đơn hàng.');
  }
  return { kind: 'payment', url: destination.toString() };
}
