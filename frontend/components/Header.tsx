'use client';

/**
 * ============================================================================
 * HEADER COMPONENT (THANH ĐẦU TRANG DÙNG CHUNG)
 * ============================================================================
 * 
 * Mục đích:
 * - Cố định ở đầu màn hình (Sticky Header) với phong cách Mobile-first.
 * - Hiển thị Logo thương hiệu BrewLite kèm biểu tượng tách cà phê.
 * - Hiển thị nút Giỏ hàng kèm Cart Badge báo số lượng sản phẩm (FR-11).
 * - Tự động cập nhật số lượng khi giỏ hàng có sự thay đổi.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const [cartCount, setCartCount] = useState<number>(0);

  // Đọc số lượng món trong giỏ từ localStorage và lắng nghe sự kiện cập nhật
  useEffect(() => {
    const updateCountFromStorage = () => {
      try {
        const storedCart = localStorage.getItem('brewlite_cart');
        if (storedCart) {
          const items = JSON.parse(storedCart);
          // Tổng số lượng đơn vị sản phẩm (FR-11)
          const totalQty = Array.isArray(items)
            ? items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
            : 0;
          setCartCount(totalQty);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        setCartCount(0);
      }
    };

    // Đọc lần đầu khi tải trang
    updateCountFromStorage();

    // Lắng nghe sự kiện tùy biến 'cart_updated' từ các component khác phát ra
    window.addEventListener('storage', updateCountFromStorage);
    window.addEventListener('cart_updated', updateCountFromStorage);

    return () => {
      window.removeEventListener('storage', updateCountFromStorage);
      window.removeEventListener('cart_updated', updateCountFromStorage);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-amber-900 text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-3">
        {/* LOGO & BRAND */}
        <Link href="/" className="flex items-center space-x-2">
          {/* Biểu tượng tách cà phê SVG */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-amber-950 shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 1v3M10 1v3M14 1v3"
              />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black tracking-wide text-amber-100">
              BrewLite
            </span>
            <p className="text-[10px] uppercase tracking-wider text-amber-300">
              Cà phê không tiền mặt
            </p>
          </div>
        </Link>

        {/* NÚT GIỎ HÀNG KÈM CART BADGE (FR-11) */}
        <Link
          href="/cart"
          aria-label="Xem giỏ hàng"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-800/80 hover:bg-amber-700 transition"
        >
          {/* Icon Giỏ hàng SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-amber-100"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>

          {/* BADGE SỐ LƯỢNG MÓN (CHỈ HIỂN THỊ KHI CÓ ÍT NHẤT 1 MÓN - AC-11.1) */}
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-sm animate-pulse">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
