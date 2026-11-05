'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CartItem,
  PaymentMethod,
} from '@/types/brewlite';
import { apiClient } from '@/utils/apiClient';
import { useCartStore } from '@/stores/cartStore';

type CheckoutModalProps = {
  items: CartItem[];
  totalAmount: number;
  onClose: () => void;
};

type CreateOrderResponse = {
  orderId: string;
};

type PaymentResponse = {
  status?: string;
  payment?: {
    status?: string;
    transactionCode?: string | null;
  };
};

type QuoteResponse = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  voucherCode?: string;
};

type ApplyVoucherResponse = {
  success?: boolean;
  message?: string;
  data?: {
    code: string;
    discountType: string;
    discountAmount: number;
    finalAmount: number;
  };
  code?: string;
  discountType?: string;
  discountAmount?: number;
  finalAmount?: number;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export default function CheckoutModal({
  items,
  totalAmount,
  onClose,
}: CheckoutModalProps) {
  const router = useRouter();
  const clearCart = useCartStore((state) => state.clearCart);
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('E_WALLET');
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState<QuoteResponse>({
    subtotal: totalAmount,
    discountAmount: 0,
    totalAmount,
  });
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyVoucher = async () => {
    setError(null);
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setQuote({ subtotal: totalAmount, discountAmount: 0, totalAmount });
      return;
    }

    setIsApplyingVoucher(true);
    try {
      const response = await apiClient.post<ApplyVoucherResponse>(
        '/promotions/apply',
        {
          code,
          orderValue: totalAmount,
        },
      );

      const voucherResult = response.data || response;
      const discountAmount = Number(voucherResult.discountAmount || 0);
      const calculatedFinal =
        voucherResult.finalAmount !== undefined
          ? Number(voucherResult.finalAmount)
          : Math.max(0, totalAmount - discountAmount);

      setQuote({
        subtotal: totalAmount,
        discountAmount,
        totalAmount: calculatedFinal,
        voucherCode: voucherResult.code || code,
      });
    } catch (applyError: unknown) {
      setQuote({ subtotal: totalAmount, discountAmount: 0, totalAmount });
      setError(
        applyError instanceof Error
          ? applyError.message
          : 'Không thể áp dụng mã giảm giá này.',
      );
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const checkoutKey = createIdempotencyKey();

      // Payload tạo đơn PENDING tuân thủ chuẩn CreateOrderDto của Backend
      const orderPayload = {
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          toppingIds: item.selectedToppings.map((topping) => topping.id),
          quantity: item.quantity,
        })),
        note: note.trim() || undefined,
        voucherCode: quote.voucherCode || undefined,
      };

      const order = await apiClient.post<CreateOrderResponse>(
        '/orders',
        orderPayload,
        { headers: { 'Idempotency-Key': checkoutKey } },
      );

      const payment = await apiClient.post<PaymentResponse>(
        '/payments',
        { orderId: order.orderId, paymentMethod },
        { headers: { 'Idempotency-Key': createIdempotencyKey() } },
      );

      const isSuccess =
        payment?.status === 'SUCCESS' ||
        payment?.status === 'PAID' ||
        payment?.payment?.status === 'SUCCESS';

      if (!isSuccess) {
        throw new Error('Thanh toán thất bại. Giỏ hàng được giữ nguyên để thử lại.');
      }

      clearCart();
      router.push(`/orders/${order.orderId}`);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể tạo đơn hàng. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="checkout-title" className="text-xl font-black text-slate-900">
              Thanh toán
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Kiểm tra thông tin trước khi đặt đơn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
            aria-label="Đóng cửa sổ thanh toán"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="voucher-code"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              Mã giảm giá
            </label>
            <div className="flex gap-2">
              <input
                id="voucher-code"
                value={voucherCode}
                onChange={(event) => {
                  setVoucherCode(event.target.value);
                  setQuote({ subtotal: totalAmount, discountAmount: 0, totalAmount });
                }}
                placeholder="Ví dụ: WELCOME10, BREW20K, FREESHIP"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="button"
                onClick={applyVoucher}
                disabled={isApplyingVoucher}
                className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:bg-slate-400"
              >
                {isApplyingVoucher ? '...' : 'Áp dụng'}
              </button>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-700">
              Phương thức thanh toán
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['E_WALLET', 'Ví điện tử'],
                ['BANK_CARD', 'Thẻ ngân hàng'],
              ] as const).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-lg border p-3 text-sm ${
                    paymentMethod === value
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={value}
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value)}
                    className="mr-2 accent-amber-700"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="order-note"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              Ghi chú đơn hàng
            </label>
            <textarea
              id="order-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Ví dụ: ít đá, ít đường"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            <p className="font-bold text-slate-800">Món đã chọn</p>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-slate-600">
                <span>{item.productName} × {item.quantity}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between text-slate-700">
              <span>Tạm tính</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Giảm giá{quote.voucherCode ? ` (${quote.voucherCode})` : ''}</span>
              <span>-{formatCurrency(quote.discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
              <span>Số tiền cần thanh toán</span>
              <span className="text-lg text-amber-900">{formatCurrency(quote.totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
          </button>
        </form>
      </div>
    </div>
  );
}
