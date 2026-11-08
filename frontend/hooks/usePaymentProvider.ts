"use client";

import { useEffect, useState } from 'react';
import type { PaymentProvider } from '../types/brewlite';
import { getPaymentProvider } from '../utils/paymentConfiguration';

export function usePaymentProvider() {
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    getPaymentProvider(controller.signal).then(value => {
      if (!controller.signal.aborted) setProvider(value);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Không tải được chế độ thanh toán. Vui lòng tải lại trang để thử lại.');
    });
    return () => controller.abort();
  }, []);
  return { provider, error };
}
