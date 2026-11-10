'use client';

import { useState } from 'react';
import Link from 'next/link';
import CartItem from '@/components/CartItem';
import CheckoutModal from '@/components/CheckoutModal';
import { useCartStore } from '@/stores/cartStore';
import { useRouter } from 'next/navigation';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalQuantity = useCartStore((state) => state.getTotalQuantity());
  const totalAmount = useCartStore((state) => state.getTotalAmount());
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const openCheckout = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('brewlite_token') : null;
    if (!token) {
      router.push('/login?redirect=/cart');
      return;
    }
    setIsCheckoutOpen(true);
  };

  if (items.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl bg-slate-50 p-6 text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="mt-4 text-xl font-black text-slate-900">Giỏ hàng đang trống</h1>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            Hãy chọn món yêu thích từ menu để bắt đầu đặt hàng.
          </p>
          <Link
            href="/"
            className="mt-5 rounded-lg bg-amber-800 px-5 py-3 text-sm font-bold text-white hover:bg-amber-900"
          >
            Xem menu
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Giỏ hàng</h1>
          <p className="text-sm text-slate-500">{totalQuantity} món</p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm font-semibold text-red-600 hover:text-red-800"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onRemove={removeItem}
            onUpdateQuantity={updateQuantity}
          />
        ))}
      </div>

      <div className="rounded-xl bg-amber-50 p-4">
        <div className="flex items-center justify-between text-base font-bold text-slate-900">
          <span>Tổng cộng</span>
          <span className="text-lg text-amber-900">{formatCurrency(totalAmount)}</span>
        </div>
        <button
          type="button"
          onClick={openCheckout}
          className="mt-4 w-full rounded-lg bg-amber-800 px-4 py-3 text-sm font-bold text-white hover:bg-amber-900"
        >
          Thanh toán
        </button>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal
          items={items}
          totalAmount={totalAmount}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </section>
  );
}
