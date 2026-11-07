"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/utils/authStorage";
import { reconcileVnpayOrder } from "@/utils/vnpayReconciliation";
import { startVnpayPayment } from "@/utils/startVnpayPayment";

type Props = {
  orderId: string;
  failed: boolean;
  expired?: boolean;
};

export default function ResumeVnpayPayment({ orderId, failed, expired = false }: Props) {
  const router = useRouter();
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
      if (!authStorage.getToken()) {
        const destination = `/orders/${encodeURIComponent(orderId)}`;
        router.push(`/login?redirect=${encodeURIComponent(destination)}`);
        return;
      }

      if (checkOnly) {
        const latest = await reconcileVnpayOrder(orderId);
        if (!["PENDING", "PAYMENT_FAILED"].includes(latest.status)) {
          window.location.reload();
          return;
        }
        setError(latest.message);
        return;
      }

      const storageKey = `brewlite_vnpay_resume:${orderId}`;
      let key = localStorage.getItem(storageKey);

      if (!key) {
        key = crypto.randomUUID();
        // Lưu trước khi gửi. Mất response thì lần sau dùng lại khóa này.
        localStorage.setItem(storageKey, key);
      }

      const destination = await startVnpayPayment(
        orderId, key,
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
          : "Chưa mở được VNPay. Hãy kiểm tra lại trạng thái đơn hàng.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <h2 className="font-bold">
        {failed ? "Thanh toán chưa thành công" : "Tiếp tục thanh toán đơn hàng"}
      </h2>
      <p id="resume-payment-help" className="mt-2 text-sm leading-relaxed">
        {failed
          ? "Bạn có thể thử thanh toán lại cho đơn này. Giỏ hàng vẫn được giữ nguyên."
          : "Nếu đã đóng hoặc rời trang VNPay, bạn có thể quay lại giao dịch đang chờ. Nếu vừa trả tiền, hãy kiểm tra trạng thái trước."}
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
          disabled={loading || expired}
          aria-busy={loading}
          aria-describedby="resume-payment-help"
          className="min-h-11 flex-1 rounded-xl bg-amber-800 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:cursor-wait disabled:opacity-60"
        >
          {loading
            ? "Đang kiểm tra VNPay..."
            : expired
              ? "Đã hết hạn thanh toán"
              : failed
              ? "Thử thanh toán lại"
              : "Tiếp tục thanh toán"}
        </button>
        <button
          type="button"
          onClick={() => resumePayment(true)}
          disabled={loading}
          className="min-h-11 rounded-xl border border-amber-800 px-4 py-3 text-sm font-semibold hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:opacity-60"
        >
          Kiểm tra trạng thái
        </button>
      </div>
    </section>
  );
}
