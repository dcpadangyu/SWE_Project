"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/utils/apiClient";
import { authStorage } from "@/utils/authStorage";
import type { Order, OrderStatus } from "@/types/brewlite";

const MOCK_ORDERS: Order[] = [
  {
    id: "mock-order-1042",
    orderCode: "#1042",
    userId: "mock-user",
    status: "PAID",
    subtotal: 89000,
    discountAmount: 0,
    totalAmount: 89000,
    items: [],
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
    items: [],
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

interface RawOrder {
  id?: string;
  orderId?: string;
  orderCode: string;
  userId: string;
  status: OrderStatus;
  subtotal: number | string;
  discountAmount?: number | string;
  totalAmount: number | string;
  items?: Order["items"];
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);

      const token = authStorage.getToken();
      if (!token) {
        if (active) {
          setOrders(MOCK_ORDERS);
          setError(
            "Vui lòng đăng nhập để xem lịch sử đơn hàng của bạn. Đang hiển thị dữ liệu mẫu.",
          );
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.get<RawOrder[] | { data: RawOrder[] }>(
          "/orders/me",
        );

        // Chuẩn hóa dữ liệu: chấp nhận cả mảng trực tiếp Order[] hoặc bọc trong { data: Order[] }
        const rawList = Array.isArray(response)
          ? response
          : response && Array.isArray(response.data)
            ? response.data
            : null;

        if (!rawList) {
          throw new Error("Dữ liệu đơn hàng không hợp lệ.");
        }

        const normalizedOrders: Order[] = rawList.map((item) => ({
          ...item,
          id: item.id || item.orderId || "",
          subtotal: Number(item.subtotal || 0),
          discountAmount: Number(item.discountAmount || 0),
          totalAmount: Number(item.totalAmount || 0),
          items: Array.isArray(item.items) ? item.items : [],
        }));

        if (active) {
          setOrders(normalizedOrders);
          setError("");
        }
      } catch (err: unknown) {
        if (active) {
          setOrders(MOCK_ORDERS);
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("đăng nhập") || msg.includes("401")) {
            setError(
              "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem đơn hàng.",
            );
          } else {
            setError(
              "Không thể tải lịch sử đơn hàng từ máy chủ. Đang hiển thị dữ liệu mẫu.",
            );
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="space-y-6 pb-24">
      <header className="pt-2">
        <h1 className="text-2xl font-black text-neutral-900">
          Lịch sử đơn hàng
        </h1>
        <p className="mt-0.5 text-xs text-neutral-500">
          Theo dõi tiến độ và các đơn đồ uống đã đặt
        </p>
      </header>

      {error && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
        >
          <span>{error}</span>
          {error.includes("đăng nhập") && (
            <Link
              href="/login?redirect=/orders"
              className="inline-flex items-center rounded-lg bg-amber-800 px-3 py-1 font-bold text-white transition hover:bg-amber-900 active:scale-95"
            >
              Đăng nhập ngay →
            </Link>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Đang tải đơn hàng">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse space-y-3 rounded-2xl border border-stone-200 p-4"
            >
              <div className="h-4 w-32 rounded bg-stone-200" />
              <div className="h-3 w-48 rounded bg-stone-100" />
              <div className="h-5 w-28 rounded bg-stone-200" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <section className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-900 shadow-inner">
            📋
          </div>

          <h2 className="mt-4 text-lg font-bold text-neutral-800">
            Chưa có đơn hàng nào
          </h2>

          <p className="mt-2 max-w-xs text-xs leading-relaxed text-neutral-500">
            Bạn chưa đặt món nào tại BrewLite. Hãy khám phá thực đơn cà phê thơm
            ngon và đặt ngay chỉ trong vài chạm nhé!
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-amber-900 active:scale-95"
          >
            <span>Khám phá thực đơn ngay</span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${encodeURIComponent(order.id)}`}
              className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-amber-400 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-neutral-900">
                    Đơn hàng {order.orderCode}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="text-sm text-neutral-500">
                  {order.items?.length ?? 0} loại món
                </span>
                <span className="font-bold text-neutral-900">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>

              <p className="mt-3 text-right text-sm font-medium text-amber-800">
                Xem chi tiết →
              </p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
