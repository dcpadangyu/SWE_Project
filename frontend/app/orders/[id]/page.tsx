"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { apiClient } from "@/utils/apiClient";
import type { Order, OrderStatus, RefundRequestInfo } from "@/types/brewlite";

import { authStorage } from "@/utils/authStorage";
import { useCartStore } from "@/stores/cartStore";
import { completePaidCheckout } from "@/utils/vnpayCheckout";
import ResumeVnpayPayment from "@/components/ResumeVnpayPayment";

interface RawOrderItem {
  productId: string;
  productName: string;
  size: Order["items"][number]["size"];
  quantity: number;
  selectedToppings?: Order["items"][number]["selectedToppings"];
  unitPrice: number | string;
  subtotal: number | string;
}

interface RawOrderResponse {
  id?: string;
  orderId?: string;
  orderCode: string;
  userId: string;
  status: OrderStatus;
  subtotal: number | string;
  discountAmount?: number | string;
  totalAmount: number | string;
  items?: RawOrderItem[];
  createdAt: string;
  paymentExpiresAt?: string;
  note?: string;
  refundRequest?: RefundRequestInfo | null;
}

const MOCK_ORDERS: Order[] = [
  {
    id: "mock-order-1042",
    orderCode: "#1042",
    userId: "mock-user",
    status: "PAID",
    subtotal: 89000,
    discountAmount: 0,
    totalAmount: 89000,
    items: [
      {
        productId: "mock-coffee-1",
        productName: "Cà phê sữa đá",
        size: "M",
        quantity: 2,
        selectedToppings: [],
        unitPrice: 30000,
        subtotal: 60000,
      },
      {
        productId: "mock-coffee-2",
        productName: "Bạc xỉu",
        size: "L",
        quantity: 1,
        selectedToppings: [],
        unitPrice: 29000,
        subtotal: 29000,
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-order-1041",
    orderCode: "#1041",
    userId: "mock-user",
    status: "READY",
    subtotal: 65000,
    discountAmount: 5000,
    totalAmount: 60000,
    items: [
      {
        productId: "mock-coffee-3",
        productName: "Trà đào",
        size: "M",
        quantity: 2,
        selectedToppings: [],
        unitPrice: 30000,
        subtotal: 60000,
      },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  PREPARING: "Đang pha chế",
  READY: "Sẵn sàng nhận nước",
  COMPLETED: "Đã hoàn thành",
  PAYMENT_FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy",
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ thời gian";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function OrderDetailContent() {
  const params = useParams<{ id: string }>();
  const orderId = decodeURIComponent(params.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const refreshOrder = useRef<(() => void) | null>(null);
  const expiryCheckedFor = useRef<string | null>(null);

  // Trạng thái hủy đơn / yêu cầu hoàn tiền
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    setCancelError(null);
    setCancelSuccess(null);
    try {
      const res = await apiClient.post<{ message: string; order?: Order; refundRequest?: RefundRequestInfo }>(
        `/orders/${order.id}/cancel`,
        { reason: cancelReason.trim() || undefined }
      );
      setIsCancelModalOpen(false);
      setCancelReason("");
      setCancelSuccess(res?.message || "Đã xử lý yêu cầu thành công!");
      refreshOrder.current?.();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Không thể thực hiện yêu cầu hủy đơn lúc này.";
      setCancelError(errMsg);
    } finally {
      setIsCancelling(false);
    }
  };

  const paymentDeadline = order?.paymentExpiresAt
    ? Date.parse(order.paymentExpiresAt)
    : Number.NaN;
  const remainingSeconds = Number.isFinite(paymentDeadline)
    ? Math.max(0, Math.ceil((paymentDeadline - now) / 1000))
    : null;

  useEffect(() => {
    if (order?.status !== "PENDING" && order?.status !== "PAYMENT_FAILED") return;
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [order?.status]);

  useEffect(() => {
    if (remainingSeconds !== 0 || !order ||
      (order.status !== "PENDING" && order.status !== "PAYMENT_FAILED") ||
      expiryCheckedFor.current === order.id) return;
    expiryCheckedFor.current = order.id;
    refreshOrder.current?.();
  }, [remainingSeconds, order]);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshCount = 0;
    const controller = new AbortController();

    async function loadOrder(initialLoad = true) {
      if (initialLoad) {
        setLoading(true);
        setError("");
      }

      // 1. Nếu là đơn mẫu thì hiển thị trực tiếp, không gọi API backend gây lỗi UUID
      const mockOrder = MOCK_ORDERS.find((item) => item.id === orderId);
      if (mockOrder) {
        if (active) {
          setOrder(mockOrder);
          setError("Đang hiển thị đơn hàng mẫu. Dữ liệu chưa lấy từ máy chủ.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.get<
          RawOrderResponse | { data: RawOrderResponse }
        >(`/orders/${encodeURIComponent(orderId)}`, {
          cache: "no-store",
          signal: controller.signal,
          handledError: true,
        });

        const rawOrder =
          response &&
          typeof response === "object" &&
          "data" in response &&
          response.data
            ? response.data
            : (response as RawOrderResponse);

        if (!rawOrder) {
          throw new Error("Không tải được đơn hàng.");
        }

        const normalizedOrder: Order = {
          ...rawOrder,
          id: rawOrder.id || rawOrder.orderId || "",
          subtotal: Number(rawOrder.subtotal || 0),
          discountAmount: Number(rawOrder.discountAmount || 0),
          totalAmount: Number(rawOrder.totalAmount || 0),
          items: Array.isArray(rawOrder.items)
            ? rawOrder.items.map((item) => ({
                ...item,
                selectedToppings: item.selectedToppings || [],
                unitPrice: Number(item.unitPrice || 0),
                subtotal: Number(item.subtotal || 0),
              }))
            : [],
        };

        if (active) {
          setOrder(normalizedOrder);
          // Return có thể đến trước IPN. Đọc lại DB, không suy ra PAID từ URL.
          if (normalizedOrder.status === "PENDING" && refreshCount < 10) {
            refreshCount += 1;
            refreshTimer = setTimeout(() => { void loadOrder(false); }, 3000);
          }
        }
      } catch {
        // Chỉ dùng dữ liệu mẫu cho những ID mẫu đã định nghĩa.
        const mockOrder = MOCK_ORDERS.find((item) => item.id === orderId);

        if (active && initialLoad) {
          if (mockOrder) {
            setOrder(mockOrder);
            setError(
              "Đang hiển thị đơn hàng mẫu. Dữ liệu chưa lấy từ máy chủ.",
            );
          } else {
            setOrder(null);
            setError(
              "Không tải được đơn hàng. Vui lòng kiểm tra kết nối hoặc đăng nhập lại.",
            );
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    refreshOrder.current = () => { void loadOrder(false); };
    void loadOrder();

    return () => {
      active = false;
      clearTimeout(refreshTimer);
      controller.abort();
      refreshOrder.current = null;
    };
  }, [orderId]);

  useEffect(() => {
    if (!order) return;

    const paidStatuses: OrderStatus[] = [
      "PAID",
      "PREPARING",
      "READY",
      "COMPLETED",
    ];

    if (!paidStatuses.includes(order.status)) {
      return;
    }

    const user = authStorage.getUser() as {
      id?: string;
    } | null;

    if (!user?.id) return;

    const userId = user.id;
    const confirmedOrderId = order.id;

    const complete = () => {
      try {
        completePaidCheckout(userId, confirmedOrderId);
      } catch {
        // Giữ nguyên giỏ nếu không đọc được lượt checkout.
        console.error("Không thể hoàn tất dữ liệu checkout local.");
      }
    };

    if (useCartStore.persist.hasHydrated()) {
      complete();
      return;
    }

    // Chờ Zustand đọc xong giỏ hàng từ localStorage.
    return useCartStore.persist.onFinishHydration(complete);
  }, [order]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl space-y-4 px-4 py-8">
        <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
        <Link href="/orders" className="text-sm text-amber-800 hover:underline">
          ← Quay lại lịch sử đơn hàng
        </Link>

        <section className="mt-6 rounded-2xl border border-gray-200 p-6 text-center">
          <div className="text-4xl" aria-hidden="true">
            ☕
          </div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">
            Không tìm thấy đơn hàng
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {error || "Đơn hàng không tồn tại hoặc bạn không có quyền xem."}
          </p>
        </section>
      </main>
    );
  }

  const isPaid = order.status === "PAID";
  const isFailed = order.status === "PAYMENT_FAILED";
  const isWaiting = order.status === "PENDING";

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-5 px-4 py-6 pb-24">
      <header>
        <Link
          href="/orders"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Lịch sử đơn hàng
        </Link>
      </header>

      {error && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          {error}
        </div>
      )}

      {/* Trạng thái đơn hàng */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        {isPaid ? (
          <>
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl text-green-700"
              aria-label="Thanh toán thành công"
            >
              ✓
            </div>

            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Thanh toán thành công!
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Mời tới quầy nhận nước.
            </p>
          </>
        ) : isFailed ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              !
            </div>

            <h1 className="mt-4 text-xl font-bold text-red-700">
              Thanh toán thất bại
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Giao dịch chưa được xác nhận thành công.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-700">
              {isWaiting ? "…" : "☕"}
            </div>

            <h1 className="mt-4 text-xl font-bold text-gray-900">
              {STATUS_LABEL[order.status] ?? order.status}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              {order.status === "READY"
                ? "Mời tới quầy nhận nước."
                : order.status === "PREPARING"
                  ? "Đơn hàng đang được pha chế."
                  : order.status === "COMPLETED"
                    ? "Đơn hàng đã hoàn thành."
                    : order.status === "CANCELLED"
                      ? "Đơn hàng này đã bị hủy."
                      : "Đang cập nhật trạng thái đơn hàng."}
            </p>
          </>
        )}

        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">Mã đơn hàng</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">
            {order.orderCode}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {formatDate(order.createdAt)}
          </p>
          {(isWaiting || isFailed) && remainingSeconds !== null && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${remainingSeconds <= 60 ? "text-red-700" : "text-amber-900"}`}>
                <span className="text-sm font-medium">Thời gian thanh toán còn lại</span>
                <span
                  role="timer"
                  aria-live="off"
                  aria-label="Thời gian còn lại, phút và giây"
                  className="text-2xl font-bold tabular-nums"
                >
                  {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                  {String(remainingSeconds % 60).padStart(2, "0")}
                </span>
              </div>
              {remainingSeconds === 0 && (
                <p role="status" className="mt-2 text-sm text-red-700">
                  Đã hết thời gian thanh toán. Đang cập nhật trạng thái đơn hàng.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Chi tiết món */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng</h2>

        <div className="mt-4 space-y-4">
          {order.items.map((item, index) => (
            <div
              key={item.id ?? `${item.productId}-${index}`}
              className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {item.productName}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Size {item.size} × {item.quantity}
                  </p>

                  {item.selectedToppings.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Topping:{" "}
                      {item.selectedToppings
                        .map((topping) => topping.name)
                        .join(", ")}
                    </p>
                  )}
                </div>

                <p className="shrink-0 font-semibold text-gray-900">
                  {formatMoney(item.subtotal)}
                </p>
              </div>
            </div>
          ))}

          {order.items.length === 0 && (
            <p className="text-sm text-gray-500">
              Không có thông tin chi tiết món trong đơn hàng.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Tạm tính</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>

          {order.voucherCode && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                Voucher ({order.voucherCode})
              </span>
              <span className="text-green-700">
                -{formatMoney(order.discountAmount)}
              </span>
            </div>
          )}

          {!order.voucherCode && order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Giảm giá</span>
              <span className="text-green-700">
                -{formatMoney(order.discountAmount)}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold">
            <span>Tổng thanh toán</span>
            <span className="text-amber-800">
              {formatMoney(order.totalAmount)}
            </span>
          </div>
        </div>

        {order.note && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-500">Ghi chú</p>
            <p className="mt-1 text-sm text-gray-800">{order.note}</p>
          </div>
        )}
      </section>

      {/* THÔNG BÁO KẾT QUẢ HỦY ĐƠN / HOÀN TIỀN */}
      {cancelSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center space-x-2">
            <span className="font-bold">✓</span>
            <span>{cancelSuccess}</span>
          </div>
        </div>
      )}

      {cancelError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center space-x-2">
            <span className="font-bold">!</span>
            <span>{cancelError}</span>
          </div>
        </div>
      )}

      {/* KHU VỰC QUẢN LÝ HỦY ĐƠN VÀ HOÀN TIỀN */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="font-bold text-gray-900">Quản lý đơn hàng</h3>

        {/* 1. Nếu đơn PENDING hoặc PAYMENT_FAILED: Nút hủy đơn ngay lập tức */}
        {(order.status === "PENDING" || order.status === "PAYMENT_FAILED") && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-3">
              Đơn hàng chưa hoàn tất thanh toán. Bạn có thể hủy đơn nếu muốn đổi món khác.
            </p>
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Hủy đơn hàng này
            </button>
          </div>
        )}

        {/* 2. Nếu đơn PAID: Xử lý yêu cầu hoàn tiền */}
        {order.status === "PAID" && (
          <div className="mt-3">
            {order.refundRequest?.status === "PENDING" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">⏳</span>
                  <div>
                    <p className="font-semibold text-amber-900">
                      Yêu cầu hoàn tiền đang chờ quầy Staff duyệt xử lý
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Số tiền dự kiến hoàn: {formatMoney(Number(order.refundRequest.amount))}
                      {order.refundRequest.reason && ` • Lý do: "${order.refundRequest.reason}"`}
                    </p>
                    <p className="mt-2 text-[11px] text-amber-800/80">
                      Nhân viên tại quầy sẽ kiểm tra và xác nhận hoàn tiền cho bạn sớm nhất có thể.
                    </p>
                  </div>
                </div>
              </div>
            ) : order.refundRequest?.status === "APPROVED" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold text-emerald-900">✓ Yêu cầu hoàn tiền đã được chấp thuận</p>
                <p className="mt-1 text-xs text-emerald-700">
                  Số tiền {formatMoney(Number(order.refundRequest.amount))} đã được ghi nhận hoàn trả.
                </p>
              </div>
            ) : order.refundRequest?.status === "REJECTED" ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold text-red-900">✕ Yêu cầu hoàn tiền không được chấp thuận</p>
                <p className="mt-1 text-xs text-red-700">
                  Vui lòng liên hệ trực tiếp nhân viên tại quầy để được hỗ trợ.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Đơn hàng đã thanh toán. Nếu có sự cố ngoài ý muốn, bạn có thể gửi yêu cầu hủy và hoàn tiền đến nhân viên quầy.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Yêu cầu hủy đơn & Hoàn tiền
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Nếu đơn PREPARING, READY, COMPLETED: Chặn hủy và giải thích rõ */}
        {(order.status === "PREPARING" || order.status === "READY" || order.status === "COMPLETED") && (
          <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-base text-gray-500">ℹ️</span>
              <div>
                <p className="font-medium text-gray-800">
                  {order.status === "COMPLETED"
                    ? "Đơn hàng đã hoàn tất giao nước."
                    : "Đồ uống đang được thực hiện hoặc đã sẵn sàng."}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Theo quy định của quán, không thể hủy đơn khi quầy Barista đã bắt đầu pha chế hoặc đã làm xong nước.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Nếu đơn CANCELLED */}
        {order.status === "CANCELLED" && (
          <div className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">Đơn hàng này đã bị hủy.</p>
          </div>
        )}
      </section>

      {/* POPUP MODAL XÁC NHẬN HỦY / HOÀN TIỀN */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              {order.status === "PAID"
                ? "Gửi yêu cầu hủy đơn & hoàn tiền"
                : "Xác nhận hủy đơn hàng"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {order.status === "PAID"
                ? "Đơn hàng của bạn đã thanh toán. Yêu cầu hoàn tiền sẽ được gửi tới nhân viên tại quầy xem xét và phê duyệt."
                : "Bạn có chắc chắn muốn hủy đơn hàng này không?"}
            </p>

            <div className="mt-4">
              <label
                htmlFor="cancel-reason"
                className="block text-xs font-semibold text-gray-700"
              >
                Lý do hủy đơn (không bắt buộc):
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="VD: Đặt nhầm món, bận việc gấp..."
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-amber-600 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex space-x-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? "Đang xử lý..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(isFailed || isWaiting) && (
        <ResumeVnpayPayment orderId={order.id} failed={isFailed} expired={remainingSeconds === 0} />
      )}

      <Link
        href="/orders"
        className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-50"
      >
        Quay lại lịch sử đơn hàng
      </Link>
    </main>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div>Đang tải đơn hàng...</div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
