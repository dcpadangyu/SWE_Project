'use client';

import Link from 'next/link';
import type { CartItem as CartItemType } from '@/types/brewlite';
import CartItem from '@/components/CartItem';
import { useCartStore } from '@/stores/cartStore';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

const sampleItems: CartItemType[] = [
  {
    id: 'sample-cappuccino-m',
    productId: '20000000-0000-4000-8000-000000000001',
    productName: 'Cappuccino',
    size: 'M',
    selectedToppings: [],
    unitPrice: 45000,
    quantity: 1,
    subtotal: 45000,
  },
  {
    id: 'sample-peach-tea-l',
    productId: '20000000-0000-4000-8000-000000000004',
    productName: 'Trà đào',
    size: 'L',
    selectedToppings: [
      { id: 'extra-peach', name: 'Thêm đào', price: 8000 },
    ],
    unitPrice: 52000,
    quantity: 2,
    subtotal: 104000,
  },
];

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const totalQuantity = useCartStore((state) => state.getTotalQuantity());
  const totalAmount = useCartStore((state) => state.getTotalAmount());

  const sampleControls = (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-900">Dữ liệu mẫu để test Cart</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {sampleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => addItem(item)}
            className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-bold text-white hover:bg-amber-900"
          >
            + {item.productName} {item.size}
          </button>
        ))}
      </div>
    </div>
  );

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
        {sampleControls}
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

      {sampleControls}

      <div className="rounded-xl bg-amber-50 p-4">
        <div className="flex items-center justify-between text-base font-bold text-slate-900">
          <span>Tổng cộng</span>
          <span className="text-lg text-amber-900">{formatCurrency(totalAmount)}</span>
        </div>
        <button
          type="button"
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-lg bg-slate-300 px-4 py-3 text-sm font-bold text-slate-600"
          title="Chức năng thanh toán sẽ được triển khai ở task tiếp theo"
        >
          Thanh toán (sẽ triển khai sau)
        </button>
      </div>
    </section>
  );
}
