'use client';

import { useState } from 'react';
import type { CartItem as CartItemType } from '@/types/brewlite';

type CartItemProps = {
  item: CartItemType;
  onRemove: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

export default function CartItem({
  item,
  onRemove,
  onUpdateQuantity,
}: CartItemProps) {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));

  const commitQuantity = () => {
    const quantity = Number(quantityInput);

    if (Number.isInteger(quantity) && quantity > 0) {
      onUpdateQuantity(item.id, quantity);
      setQuantityInput(String(quantity));
      return;
    }

    setQuantityInput(String(item.quantity));
  };

  const changeQuantity = (quantity: number) => {
    onUpdateQuantity(item.id, quantity);
    setQuantityInput(String(quantity));
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-2xl">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            '☕'
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="truncate font-bold text-slate-900">{item.productName}</h2>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="text-xs font-semibold text-red-600 hover:text-red-800"
              aria-label={`Xóa ${item.productName}`}
            >
              Xóa
            </button>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Size {item.size}
            {item.selectedToppings.length > 0
              ? ` · ${item.selectedToppings.map((topping) => topping.name).join(', ')}`
              : ''}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => changeQuantity(item.quantity - 1)}
                className="px-3 py-1 text-lg text-slate-700 hover:bg-slate-100"
                aria-label={`Giảm số lượng ${item.productName}`}
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={quantityInput}
                onChange={(event) => {
                  setQuantityInput(event.target.value.replace(/\D/g, ''));
                }}
                onBlur={commitQuantity}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                }}
                className="h-8 w-10 border-x border-slate-200 bg-white px-1 py-1 text-center text-sm font-semibold text-slate-900 outline-none focus:bg-amber-50 focus:ring-1 focus:ring-amber-400"
                aria-label={`Số lượng ${item.productName}`}
              />
              <button
                type="button"
                onClick={() => changeQuantity(item.quantity + 1)}
                className="px-3 py-1 text-lg text-slate-700 hover:bg-slate-100"
                aria-label={`Tăng số lượng ${item.productName}`}
              >
                +
              </button>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">
                {formatCurrency(item.unitPrice)} / ly
              </p>
              <p className="font-bold text-amber-900">{formatCurrency(item.subtotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
