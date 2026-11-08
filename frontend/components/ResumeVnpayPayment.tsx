"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/utils/authStorage";
import { reconcileVnpayOrder } from "@/utils/vnpayReconciliation";
import { startPayment } from "@/utils/startPayment";
import { apiClient } from "@/utils/apiClient";
import { usePaymentProvider } from "@/hooks/usePaymentProvider";

type Props = {
  orderId: string;
  failed: boolean;
  expired?: boolean;
};

export default function ResumeVnpayPayment({ orderId, failed, expired = false }: Props) {
  const router = useRouter();
  const { provider, error: configurationError } = usePaymentProvider();
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resumePayment = async (checkOnly = false) => {
    if (expired && !checkOnly) return;
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      if (!provider) throw new Error(configurationError || "Đang tải chế độ thanh toán.");
      if (!authStorage.getToken()) {
        const destination = `/orders/${encodeURIComponent(orderId)}`;
        router.push(`/login?redirect=${encodeURIComponent(destination)}`);
        return;
      }

      if (checkOnly) {
        if (provider === "MOCK") {
          window.location.reload();
          return;
        }
        const latest = await reconcileVnpayOrder(orderId);
        if (!["PENDING", "PAYMENT_FAILED"].includes(latest.status)) {
          window.location.reload();
          return;
        }
        setError(latest.message);
        return;
      }

      // Đọc trạng thái mới nhất trước khi thử lại, không đổi khóa khi kết quả còn chưa rõ.
      const current = await apiClient.get<{ status: string }>(`/orders/${encodeURIComponent(orderId)}`, { cache: "no-store", handledError: true });
      if (!["PENDING", "PAYMENT_FAILED"].includes(current.status)) {
        window.location.reload();
        return;
      }
      const storageKey = `brewlite_payment_resume:${provider}:${orderId}`;
      let key = localStorage.getItem(storageKey);

      if (!key) {
        key = crypto.randomUUID();
        // Lưu trước khi gửi. Mất response thì lần sau dùng lại khóa này.
        localStorage.setItem(storageKey, key);
      }

      const destination = await startPayment(
        provider, orderId, key,
        (retryKey) => localStorage.setItem(storageKey, retryKey),
      );
      if (destination.kind === "order") {
        window.location.reload();
        return;
      }
      window.location.assign(destination.url);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Chưa thể thanh toán. Hãy kiểm tra lại trạng thái đơn hàng.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <h2 className="font-bold">
        {provider === "MOCK" ? "Thanh toán thử nghiệm" : failed ? "Thanh toán chưa thành công" : "Tiếp tục thanh toán đơn hàng"}
      </h2>
      <p id="resume-payment-help" className="mt-2 text-sm leading-relaxed">
        {configurationError || (provider === "MOCK" ? "Thanh toán giả lập, không thu tiền thật. Bạn có thể hoàn tất đơn thử nghiệm này."
          : !provider ? "Đang tải chế độ thanh toán..." : failed
          ? "Bạn có thể thử thanh toán lại cho đơn này. Giỏ hàng vẫn được giữ nguyên."
          : "Nếu đã đóng hoặc rời trang VNPay, bạn có thể quay lại giao dịch đang chờ. Nếu vừa trả tiền, hãy kiểm tra trạng thái trước.")}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => resumePayment()}
          disabled={loading || expired || !provider}
          aria-busy={loading}
          aria-describedby="resume-payment-help"
          className="min-h-11 flex-1 rounded-xl bg-amber-800 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:cursor-wait disabled:opacity-60"
        >
          {loading
            ? "Đang xử lý..."
            : expired
              ? "Đã hết hạn thanh toán"
              : provider === "MOCK" ? "Thanh toán thử nghiệm" : failed
              ? "Thử thanh toán lại"
              : "Tiếp tục thanh toán"}
        </button>
        <button
          type="button"
          onClick={() => resumePayment(true)}
          disabled={loading || !provider}
          className="min-h-11 rounded-xl border border-amber-800 px-4 py-3 text-sm font-semibold hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:opacity-60"
        >
          Kiểm tra trạng thái
        </button>
      </div>
    </section>
  );
}
