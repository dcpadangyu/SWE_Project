"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { apiClient } from "@/utils/apiClient";
import type { Order, OrderStatus } from "@/types/brewlite";

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
  note?: string;
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

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      setLoading(true);
      setError("");

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
        >(`/orders/${encodeURIComponent(orderId)}`);

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
        }
      } catch {
        // Chỉ dùng dữ liệu mẫu cho những ID mẫu đã định nghĩa.
        const mockOrder = MOCK_ORDERS.find((item) => item.id === orderId);

        if (active) {
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

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

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

      {/* Thanh toán thất bại */}
      {isFailed && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-bold text-red-800">Cần thanh toán lại</h2>

          <p className="mt-2 text-sm text-red-700">
            Khi cổng thanh toán hỗ trợ thử lại, bạn có thể tiếp tục thanh toán
            đơn này. Giỏ hàng hiện tại sẽ không bị tự động xóa.
          </p>

          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-xl bg-gray-300 px-4 py-3 font-semibold text-gray-600"
          >
            Thử thanh toán lại (chưa tích hợp API)
          </button>
        </section>
      )}

      {isWaiting && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Đơn hàng đang chờ thanh toán. Vui lòng kiểm tra trạng thái giao dịch
          trước khi thử thanh toán lại.
        </section>
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
