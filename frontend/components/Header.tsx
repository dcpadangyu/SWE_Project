'use client';

/**
 * ============================================================================
 * HEADER COMPONENT (THANH ĐẦU TRANG DÙNG CHUNG)
 * ============================================================================
 * 
 * Mục đích:
 * - Cố định ở đầu màn hình (Sticky Header) với thanh nền tràn viền 100% trên Desktop.
 * - Hiển thị Logo thương hiệu BrewLite kèm biểu tượng tách cà phê.
 * - Hiển thị menu điều hướng desktop (Thực đơn, Giỏ hàng, Lịch sử đơn, Tài khoản).
 * - Hiển thị nút Giỏ hàng kèm Cart Badge báo số lượng sản phẩm (FR-11).
 * - Tự động cập nhật số lượng khi giỏ hàng có sự thay đổi thông qua Zustand store.
 */

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import { authStorage } from '@/utils/authStorage';
import { User } from '@/types/brewlite';

const emptySubscribe = () => () => {};

export default function Header() {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const cartCount = useCartStore((state) => state.getTotalQuantity());

  const displayCount = mounted ? cartCount : 0;

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const sync = () => {
      setUser(authStorage.getUser());
    };
    sync();
    window.addEventListener('auth_updated', sync);
    return () => window.removeEventListener('auth_updated', sync);
  }, []);

  const isStaff = user?.role === 'BARISTA' || user?.role === 'ADMIN';

  const handleLogout = () => {
    authStorage.clearSession();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-amber-900 text-white shadow-md">
      <div className="w-full max-w-md md:max-w-none md:px-8 lg:px-12 mx-auto flex items-center justify-between px-4 py-3">
        {/* LOGO & BRAND */}
        <Link href={isStaff ? "/staff" : "/"} className="flex items-center space-x-2">
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
              {isStaff ? "BrewLite Staff" : "BrewLite"}
            </span>
            <p className="text-[10px] uppercase tracking-wider text-amber-300">
              {isStaff ? "Quản lý quầy pha chế & kho" : "Cà phê không tiền mặt"}
            </p>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION LINKS */}
        {isStaff ? null : (
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-amber-100">
            <Link href="/" className="hover:text-amber-300 transition">
              Thực đơn
            </Link>
            <Link href="/cart" className="hover:text-amber-300 transition">
              Giỏ hàng
            </Link>
            <Link href="/orders" className="hover:text-amber-300 transition">
              Lịch sử đơn
            </Link>
            <Link href="/UserProfile" className="hover:text-amber-300 transition">
              Tài khoản
            </Link>
          </nav>
        )}

        {/* PHẦN ĐIỀU KHIỂN PHẢI */}
        {isStaff ? (
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-amber-100">
                {user?.fullName || user?.email}
              </span>
              <span className="text-[10px] text-amber-300 uppercase tracking-wider">
                {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Barista Quầy'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-amber-700 bg-amber-800/90 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-700 transition"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          /* NÚT GIỎ HÀNG KÈM CART BADGE CHO KHÁCH HÀNG (FR-11) */
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
            {displayCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-sm animate-pulse">
                {displayCount > 99 ? '99+' : displayCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
