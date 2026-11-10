"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/types/brewlite";
import { apiClient, ApiError } from "@/utils/apiClient";
import { startPayment } from "@/utils/startPayment";
import { usePaymentProvider } from "@/hooks/usePaymentProvider";

import { authStorage } from "@/utils/authStorage";

import {
  readPendingCheckout,
  savePendingCheckout,
  removePendingCheckout,
} from "@/utils/vnpayCheckout";

type CheckoutModalProps = {
  items: CartItem[];
  totalAmount: number;
  onClose: () => void;
};

type CreateOrderResponse = {
  orderId: string;
};

type OrderStatusResponse = {
  status: string;
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
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
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
  const { provider, error: configurationError } = usePaymentProvider();
  const submittingRef = useRef(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<QuoteResponse>({
    subtotal: totalAmount,
    discountAmount: 0,
    totalAmount,
  });
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
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
        "/promotions/apply",
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
          : "Không thể áp dụng mã giảm giá này.",
      );
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submittingRef.current) return;

    submittingRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      if (!provider) throw new Error(configurationError || "Đang tải chế độ thanh toán. Vui lòng chờ.");
      const user = authStorage.getUser() as {
        id?: string;
      } | null;

      if (!authStorage.getToken() || !user?.id) {
        router.push("/login?redirect=/cart");
        return;
      }

      if (items.length === 0) {
        throw new Error("Giỏ hàng đang trống.");
      }

      const orderPayload = {
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          toppingIds: item.selectedToppings.map((topping) => topping.id).sort(),
          quantity: item.quantity,
        })),
        note: note.trim() || undefined,
        voucherCode: quote.voucherCode || undefined,
      };

      const fingerprint = JSON.stringify(orderPayload);

      let pending = readPendingCheckout(user.id);

      // Đơn cũ đã đóng không được giữ chân một giỏ hàng mới.
      if (pending?.orderId && pending.fingerprint !== fingerprint) {
        const previousOrder = await apiClient.get<OrderStatusResponse>(
          `/orders/${encodeURIComponent(pending.orderId)}`,
        );
        if (["PAID", "PREPARING", "READY", "COMPLETED", "CANCELLED"].includes(previousOrder.status)) {
          removePendingCheckout(user.id);
          pending = null;
        }
      }

      // Không tạo đơn mới nếu lượt cũ chưa được xử lý.
      if (pending && pending.fingerprint !== fingerprint) {
        if (pending.orderId) {
          router.push(`/orders/${encodeURIComponent(pending.orderId)}`);
          return;
        }

        throw new Error(
          "Có yêu cầu tạo đơn chưa rõ kết quả. Giữ nguyên giỏ hàng, ghi chú và voucher để gửi lại yêu cầu.",
        );
      }

      if (!pending) {
        pending = {
          userId: user.id,
          fingerprint,
          checkoutKey: createIdempotencyKey(),
          paymentKey: createIdempotencyKey(),
          cartSnapshot: JSON.stringify(items),
        };

        // Lưu trước request để có thể gửi lại khi mạng lỗi.
        savePendingCheckout(pending);
      }

      if (pending.orderId) {
        const currentOrder = await apiClient.get<OrderStatusResponse>(
          `/orders/${encodeURIComponent(pending.orderId)}`,
        );

        const paidStatuses = ["PAID", "PREPARING", "READY", "COMPLETED"];

        if (paidStatuses.includes(currentOrder.status)) {
          router.push(`/orders/${encodeURIComponent(pending.orderId)}`);
          return;
        }

        if (currentOrder.status === "CANCELLED") {
          removePendingCheckout(user.id);

          router.push(`/orders/${encodeURIComponent(pending.orderId)}`);
          return;
        }

        if (currentOrder.status === "PAYMENT_FAILED") {
          // Khách chủ động thử lại sau thất bại đã xác nhận.
          pending.paymentKey = createIdempotencyKey();
          savePendingCheckout(pending);
        }
      }

      if (!pending.orderId) {
        const order = await apiClient.post<CreateOrderResponse>(
          "/orders",
          orderPayload,
          {
            headers: {
              "Idempotency-Key": pending.checkoutKey,
            },
          },
        );

        pending.orderId = order.orderId;
        savePendingCheckout(pending);
      }

      const checkout = pending;
      const destination = await startPayment(
        provider,
        checkout.orderId!, checkout.paymentKey,
        (key) => {
          checkout.paymentKey = key;
          savePendingCheckout(checkout);
        },
        simulateFailure,
      );
      if (destination.kind === "order") {
        router.push(`/orders/${encodeURIComponent(destination.orderId)}`);
        return;
      }

      // Chưa xóa giỏ, chưa coi là thanh toán thành công.
      window.location.assign(destination.url);
    } catch (submitError: unknown) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Không thể bắt đầu thanh toán. Vui lòng thử lại.";
      setError(message);

      // Nếu lỗi từ chối thanh toán (402 PAYMENT_FAILED) và đã có orderId, điều hướng sau 1.2s để xem trạng thái đơn
      if (submitError instanceof ApiError && submitError.status === 402) {
        const currentUserId = authStorage.getUser()?.id;
        const savedPending = currentUserId ? readPendingCheckout(currentUserId) : null;
        if (savedPending?.orderId) {
          setTimeout(() => {
            router.push(`/orders/${encodeURIComponent(savedPending.orderId!)}`);
          }, 1200);
        }
      }
    } finally {
      submittingRef.current = false;
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
            <h2
              id="checkout-title"
              className="text-xl font-black text-slate-900"
            >
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
                  setQuote({
                    subtotal: totalAmount,
                    discountAmount: 0,
                    totalAmount,
                  });
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
                {isApplyingVoucher ? "..." : "Áp dụng"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              {provider === "MOCK" ? "Thanh toán thử nghiệm" : provider === "VNPAY" ? "Thanh toán qua VNPay" : "Đang tải chế độ thanh toán..."}
            </p>

            <p className="mt-1 text-xs text-amber-800">
              {configurationError || (provider === "MOCK"
                ? "Giao dịch được giả lập, không thu tiền thật. Đơn hàng vẫn được lưu và xử lý trên hệ thống."
                : provider === "VNPAY"
                  ? "Bạn sẽ được chuyển đến VNPay để chọn phương thức và xác nhận thanh toán."
                  : "Vui lòng chờ trước khi xác nhận đặt đơn.")}
            </p>

            {provider === "MOCK" && (
              <label className="mt-2.5 flex items-center gap-2 cursor-pointer border-t border-amber-200/60 pt-2 text-xs font-medium text-amber-950">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-300 text-amber-800 focus:ring-amber-500"
                />
                <span>Mô phỏng thanh toán thất bại (simulateFailure để kiểm thử Task 8)</span>
              </label>
            )}
          </div>

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
              <div
                key={item.id}
                className="flex justify-between gap-3 text-slate-600"
              >
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between text-slate-700">
              <span>Tạm tính</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>
                Giảm giá{quote.voucherCode ? ` (${quote.voucherCode})` : ""}
              </span>
              <span>-{formatCurrency(quote.discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
              <span>Số tiền cần thanh toán</span>
              <span className="text-lg text-amber-900">
                {formatCurrency(quote.totalAmount)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !provider}
            className="w-full rounded-lg bg-amber-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Đang xử lý thanh toán..." : provider === "MOCK" ? "Thanh toán thử nghiệm" : provider === "VNPAY" ? "Tiếp tục với VNPay" : "Chưa thể thanh toán"}
          </button>
        </form>
      </div>
    </div>
  );
}
