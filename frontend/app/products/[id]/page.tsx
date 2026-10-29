
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type {
  Product,
  Size,
  SelectedTopping,
  CartItem,
} from '@/types/brewlite';
import {
  calculateItemPrice,
  calculateLineSubtotal,
} from '@/utils/pricing';

// MOCK DATA: dùng để kiểm thử giao diện Task 4
// Sau này thay bằng dữ liệu từ API Backend.
const mockProduct: Product = {
  id: 'coffee-001',
  name: 'Cà phê sữa đá',
  description:
    'Cà phê đậm đà kết hợp cùng sữa đặc, mang đến hương vị thơm ngon.',
  category: 'Cà phê',
  priceS: 25000,
  priceM: 30000,
  priceL: 35000,
  imageUrl: '',
  stock: 50,
  isAvailable: true,
  toppingOptions: [
    {
      id: 'top-001',
      name: 'Trân châu đen',
      price: 5000,
      isAvailable: true,
    },
    {
      id: 'top-002',
      name: 'Kem cheese',
      price: 8000,
      isAvailable: true,
    },
    {
      id: 'top-003',
      name: 'Thạch cà phê',
      price: 6000,
      isAvailable: true,
    },
  ],
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();

  const [size, setSize] = useState<Size>('M');
  const [selectedToppings, setSelectedToppings] = useState<
    SelectedTopping[]
  >([]);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  // Hiện tại chỉ có 1 sản phẩm mock.
  // ID khác sẽ báo không tìm thấy sản phẩm.
  const product =
    params.id === mockProduct.id ? mockProduct : null;

  if (!product) {
    return (
      <div className="space-y-4 py-10 text-center">
        <h2 className="text-lg font-bold">
          Không tìm thấy sản phẩm
        </h2>
        <Link
          href="/"
          className="inline-block rounded-xl bg-amber-900 px-5 py-3 text-white"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const available = product.isAvailable && product.stock > 0;

  const unitPrice = calculateItemPrice(
    product,
    size,
    selectedToppings
  );

  const subtotal = calculateLineSubtotal(unitPrice, quantity);

  function toggleTopping(
  topping: Product['toppingOptions'][number]
  ) {
    setMessage('');

    setSelectedToppings((current) => {
      const exists = current.some((item) => item.id === topping.id);

      if (exists) {
        return current.filter((item) => item.id !== topping.id);
      }

      return [
        ...current,
        {
          id: topping.id,
          name: topping.name,
          price: topping.price,
        },
      ];
    });
  }

  function addToCart() {
    if (!product) {
    setMessage('Không tìm thấy sản phẩm.');
    return;
    }

    if (!available) {
      setMessage('Sản phẩm hiện không khả dụng.');
      return;
    }

    if (quantity < 1 || quantity > product.stock) {
      setMessage('Số lượng không hợp lệ.');
      return;
    }

    try {
      const stored = localStorage.getItem('brewlite_cart');
      const cart: CartItem[] = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(cart)) {
        setMessage('Dữ liệu giỏ hàng không hợp lệ.');
        return;
      }

      // Sắp xếp ID topping để so sánh cấu hình.
      const toppingKey = selectedToppings
        .map((item) => item.id)
        .sort()
        .join(',');

      const existingIndex = cart.findIndex((item) => {
        const existingToppingKey = item.selectedToppings
          .map((topping) => topping.id)
          .sort()
          .join(',');

        return (
          item.productId === product.id &&
          item.size === size &&
          existingToppingKey === toppingKey
        );
      });

      const updatedCart = [...cart];

      if (existingIndex >= 0) {
        const existing = updatedCart[existingIndex];
        const newQuantity = existing.quantity + quantity;

        if (newQuantity > product.stock) {
          setMessage('Số lượng vượt quá tồn kho mock.');
          return;
        }

        updatedCart[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          unitPrice,
          subtotal: calculateLineSubtotal(
            unitPrice,
            newQuantity
          ),
        };
      } else {
        const newItem: CartItem = {
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl,
          size,
          selectedToppings: [...selectedToppings],
          unitPrice,
          quantity,
          subtotal,
        };

        updatedCart.push(newItem);
      }

      localStorage.setItem(
        'brewlite_cart',
        JSON.stringify(updatedCart)
      );

      // Thông báo cho Header và BottomNav cập nhật badge.
      window.dispatchEvent(new Event('cart_updated'));

      setMessage('Đã thêm món vào giỏ hàng!');
    } catch {
      setMessage('Không thể cập nhật giỏ hàng.');
    }
  }

  return (
    <div className="space-y-5 pb-4">
      {/* QUAY LẠI */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-amber-900"
      >
        <span aria-hidden="true">←</span>
        Quay lại thực đơn
      </Link>

      {/* THÔNG TIN SẢN PHẨM */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex h-48 items-center justify-center bg-amber-50">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-7xl" aria-hidden="true">
              ☕
            </span>
          )}
        </div>

        <div className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            {product.category}
          </p>

          <h1 className="text-2xl font-black text-slate-900">
            {product.name}
          </h1>

          <p className="text-sm leading-6 text-slate-500">
            {product.description}
          </p>

          <p className="pt-1 text-sm font-medium text-emerald-700">
            {available ? '● Đang mở bán' : '● Hết hàng'}
          </p>
        </div>
      </section>

      {/* CHỌN SIZE */}
      <section className="space-y-3">
        <div>
          <h2 className="font-bold text-slate-900">
            1. Chọn kích cỡ
          </h2>
          <p className="text-xs text-slate-500">
            Chọn size phù hợp với bạn
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { size: 'S', price: product.priceS },
              { size: 'M', price: product.priceM },
              { size: 'L', price: product.priceL },
            ] as const
          ).map((option) => (
            <button
              key={option.size}
              type="button"
              onClick={() => {
                setSize(option.size);
                setMessage('');
              }}
              aria-pressed={size === option.size}
              className={`rounded-xl border p-3 text-center transition ${
                size === option.size
                  ? 'border-amber-900 bg-amber-50 ring-1 ring-amber-900'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <span className="block text-lg font-black">
                {option.size}
              </span>
              <span className="mt-1 block text-xs text-slate-600">
                {formatPrice(option.price)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* CHỌN TOPPING */}
      <section className="space-y-3">
        <div>
          <h2 className="font-bold text-slate-900">
            2. Topping thêm
          </h2>
          <p className="text-xs text-slate-500">
            Có thể chọn nhiều topping
          </p>
        </div>

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {product.toppingOptions
            .filter((topping) => topping.isAvailable)
            .map((topping) => {
              const checked = selectedToppings.some(
                (item) => item.id === topping.id
              );

              return (
                <label
                  key={topping.id}
                  className="flex cursor-pointer items-center gap-3 p-3"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTopping(topping)}
                    className="h-4 w-4 accent-amber-900"
                  />

                  <span className="flex-1 text-sm font-medium">
                    {topping.name}
                  </span>

                  <span className="text-sm text-slate-600">
                    +{formatPrice(topping.price)}
                  </span>
                </label>
              );
            })}
        </div>
      </section>

      {/* CHỌN SỐ LƯỢNG */}
      <section className="space-y-3">
        <h2 className="font-bold text-slate-900">
          3. Số lượng
        </h2>

        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={quantity <= 1}
            onClick={() => {
              setQuantity((current) => Math.max(1, current - 1));
              setMessage('');
            }}
            aria-label="Giảm số lượng"
            className="h-10 w-10 rounded-xl border border-slate-200 text-lg disabled:opacity-40"
          >
            −
          </button>

          <span
            className="min-w-8 text-center text-lg font-bold"
            aria-live="polite"
          >
            {quantity}
          </span>

          <button
            type="button"
            disabled={quantity >= product.stock}
            onClick={() => {
              setQuantity((current) =>
                Math.min(product.stock, current + 1)
              );
              setMessage('');
            }}
            aria-label="Tăng số lượng"
            className="h-10 w-10 rounded-xl border border-slate-200 text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </section>

      {/* TỔNG TIỀN */}
      <section className="space-y-2 rounded-2xl bg-amber-50 p-4">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Đơn giá / ly</span>
          <span>{formatPrice(unitPrice)}</span>
        </div>

        <div className="flex justify-between border-t border-amber-200 pt-3">
          <span className="font-bold text-slate-900">
            Thành tiền
          </span>
          <span className="text-xl font-black text-amber-950">
            {formatPrice(subtotal)}
          </span>
        </div>
      </section>

      {/* THÔNG BÁO */}
      {message && (
        <p
          role="status"
          className={`rounded-xl p-3 text-sm ${
            message.startsWith('Đã thêm')
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </p>
      )}

      {/* NÚT THÊM GIỎ */}
      <button
        type="button"
        disabled={!available}
        onClick={addToCart}
        className="w-full rounded-xl bg-amber-900 px-4 py-4 font-bold text-white shadow-md transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {available
          ? `Thêm vào giỏ · ${formatPrice(subtotal)}`
          : 'Sản phẩm hiện không khả dụng'}
      </button>

      <p className="text-center text-xs text-slate-400">
        Giá trên là dữ liệu mock phục vụ kiểm thử giao diện.
      </p>
    </div>
  );
}
