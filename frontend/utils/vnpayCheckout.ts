import { useCartStore } from "@/stores/cartStore";

export type PendingCheckout = {
  userId: string;
  fingerprint: string;
  checkoutKey: string;
  paymentKey: string;
  orderId?: string;
  cartSnapshot: string;
};

function storageKey(userId: string): string {
  return `brewlite_vnpay_checkout:${userId}`;
}

export function readPendingCheckout(userId: string): PendingCheckout | null {
  const raw = sessionStorage.getItem(storageKey(userId));

  if (!raw) return null;

  let value: PendingCheckout;

  try {
    value = JSON.parse(raw) as PendingCheckout;
  } catch {
    throw new Error(
      "Không đọc được lượt thanh toán cũ. Hãy kiểm tra lịch sử đơn hàng.",
    );
  }

  if (
    value.userId !== userId ||
    typeof value.fingerprint !== "string" ||
    typeof value.checkoutKey !== "string" ||
    typeof value.paymentKey !== "string" ||
    typeof value.cartSnapshot !== "string" ||
    (value.orderId !== undefined && typeof value.orderId !== "string")
  ) {
    throw new Error(
      "Dữ liệu checkout không hợp lệ. Hãy kiểm tra lịch sử đơn hàng.",
    );
  }

  return value;
}

export function savePendingCheckout(value: PendingCheckout): void {
  sessionStorage.setItem(storageKey(value.userId), JSON.stringify(value));
}

export function removePendingCheckout(userId: string): void {
  sessionStorage.removeItem(storageKey(userId));
}

export function completePaidCheckout(userId: string, orderId: string): void {
  const pending = readPendingCheckout(userId);

  if (!pending || pending.orderId !== orderId) {
    return;
  }

  const cart = useCartStore.getState();

  /*
   * Chỉ xóa nếu giỏ vẫn đúng snapshot của lượt đã thanh toán.
   * Nếu khách đã sửa giỏ ở tab khác, giữ lại để tránh mất món mới.
   */
  if (JSON.stringify(cart.items) === pending.cartSnapshot) {
    cart.clearCart();
  }

  removePendingCheckout(userId);
}
