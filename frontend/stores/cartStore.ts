'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem, SelectedTopping } from '@/types/brewlite';

const CART_STORAGE_KEY = 'brewlite_cart';

type CartStore = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalQuantity: () => number;
  getTotalAmount: () => number;
};

function getToppingKey(toppings: SelectedTopping[]): string {
  return toppings
    .map((topping) => topping.id)
    .sort()
    .join('|');
}

function isSameConfiguration(first: CartItem, second: CartItem): boolean {
  return (
    first.productId === second.productId &&
    first.size === second.size &&
    getToppingKey(first.selectedToppings) === getToppingKey(second.selectedToppings)
  );
}

function normalizeItem(item: CartItem, quantity = item.quantity): CartItem {
  return {
    ...item,
    quantity,
    subtotal: item.unitPrice * quantity,
  };
}

function notifyCartUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cart_updated'));
  }
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex((currentItem) =>
            isSameConfiguration(currentItem, item),
          );

          if (existingIndex === -1) {
            return { items: [...state.items, normalizeItem(item)] };
          }

          const nextItems = [...state.items];
          const existingItem = nextItems[existingIndex];
          nextItems[existingIndex] = normalizeItem(
            existingItem,
            existingItem.quantity + item.quantity,
          );
          return { items: nextItems };
        });
        notifyCartUpdated();
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
        notifyCartUpdated();
      },

      updateQuantity: (itemId, quantity) => {
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.id !== itemId)
              : state.items.map((item) =>
                  item.id === itemId ? normalizeItem(item, quantity) : item,
                ),
        }));
        notifyCartUpdated();
      },

      clearCart: () => {
        set({ items: [] });
        notifyCartUpdated();
      },

      getTotalQuantity: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),

      getTotalAmount: () =>
        get().items.reduce((total, item) => total + item.subtotal, 0),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
