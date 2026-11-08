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

  // NEXT_PUBLIC_* được Next.js chốt lúc build; chỉ cho phép đúng origin đã cấu hình.
  const configuredOrigins = process.env.NEXT_PUBLIC_VNPAY_ALLOWED_ORIGINS ??
    'https://sandbox.vnpayment.vn';
  let destination: URL;
  let allowedOrigins: string[];
  try {
    destination = new URL(payment.paymentUrl);
    allowedOrigins = configuredOrigins.split(',').map(value => {
      const url = new URL(value.trim());
      if (url.protocol !== 'https:' || url.username || url.password ||
          url.pathname !== '/' || url.search || url.hash) throw new Error();
      return url.origin;
    });
  } catch {
    throw new Error('Địa chỉ cổng thanh toán không hợp lệ. Hãy kiểm tra cấu hình VNPay.');
  }
  if (payment.orderId !== orderId || destination.protocol !== 'https:' ||
    destination.username || destination.password || !allowedOrigins.includes(destination.origin)) {
    throw new Error('Địa chỉ cổng thanh toán không hợp lệ. Hãy kiểm tra lại đơn hàng.');
  }
  return { kind: 'payment', url: destination.toString() };
}
