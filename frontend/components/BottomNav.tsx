'use client';

/**
 * ============================================================================
 * BOTTOM NAVIGATION BAR (THANH ĐIỀU HƯỚNG CHÂN TRANG MOBILE-FIRST)
 * ============================================================================
 * 
 * Mục đích:
 * - Cố định ở đáy màn hình điện thoại (Fixed Bottom Nav) theo đúng Wireframe Mục 7.
 * - Cho phép khách hàng chuyển đổi nhanh giữa 4 phân hệ chính:
 *   1. Thực đơn (Menu)
 *   2. Giỏ hàng (Cart)
 *   3. Lịch sử đơn hàng (Orders)
 *   4. Tài khoản (Profile)
 * - Tự động đổi màu làm nổi bật tab đang xem dựa trên đường dẫn hiện tại (usePathname).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';

export default function BottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((state) => state.getTotalQuantity());

  // Danh sách các tab điều hướng chuẩn
  const navTabs = [
    {
      name: 'Thực đơn',
      href: '/',
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 ${active ? 'text-amber-800' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.8}
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
      ),
    },
    {
      name: 'Giỏ hàng',
      href: '/cart',
      badge: cartCount,
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 ${active ? 'text-amber-800' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
    },
    {
      name: 'Đơn hàng',
      href: '/orders',
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 ${active ? 'text-amber-800' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      name: 'Tài khoản',
      href: '/profile',
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 ${active ? 'text-amber-800' : 'text-slate-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md border-t border-slate-200 bg-white/95 backdrop-blur shadow-lg">
      <div className="grid grid-cols-4 py-1.5">
        {navTabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 transition-colors ${
                isActive ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-amber-700'
              }`}
            >
              <div className="relative">
                {tab.icon(isActive)}
                {/* Badge phụ hiển thị trên icon Giỏ hàng */}
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs">
                    {tab.badge! > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-0.5 ${isActive ? 'font-semibold text-amber-800' : ''}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
