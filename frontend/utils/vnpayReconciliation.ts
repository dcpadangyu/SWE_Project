import { apiClient } from './apiClient';

export type ReconciliationResult = {
  orderId: string;
  status: string;
  canPay: boolean;
  message: string;
};

export function reconcileVnpayOrder(orderId: string) {
  return apiClient.post<ReconciliationResult>(
    '/payments/vnpay/reconcile', { orderId }, { handledError: true },
  );
}
