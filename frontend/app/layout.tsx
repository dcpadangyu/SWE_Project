/**
 * ============================================================================
 * ROOT LAYOUT (KHUNG GIAO DIỆN GỐC DÙNG CHUNG CỦA ỨNG DỤNG)
 * ============================================================================
 * 
 * Mục đích:
 * - Responsive toàn diện:
 *   + Trên máy tính (Desktop >= md): Full màn hình 100% chiều rộng, Header tràn viền (edge-to-edge),
 *     nội dung co giãn thoáng đãng trên nền sáng trang nhã, tự động ẩn thanh điều hướng dưới đáy.
 *   + Trên điện thoại (Mobile < md): Giữ nguyên chuẩn Mobile-first (max-w-md),
 *     có thanh Bottom Navigation cố định dưới đáy.
 */

import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import StaffRoleGuard from '@/components/StaffRoleGuard';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Cấu hình thông tin SEO và tiêu đề ứng dụng
export const metadata: Metadata = {
  title: 'BrewLite — Đặt cà phê không dùng tiền mặt',
  description:
    'Ứng dụng đặt đồ uống trực tuyến không tiền mặt, nhanh chóng và tiện lợi. Đồ án Công nghệ phần mềm SGU.',
};

// Cấu hình Viewport tối ưu cho thiết bị di động
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-100 text-slate-800 flex flex-col selection:bg-amber-500 selection:text-white antialiased">
        {/* Bộ phân quyền tự động chuyển hướng Staff về /staff */}
        <Suspense fallback={null}>
          <StaffRoleGuard />
        </Suspense>

        {/* Header trên cùng (Full width 100% mép tới mép trên Desktop) */}
        <Header />

        {/* Nội dung trang con (Mobile: max-w-md mx-auto; Desktop: full width rộng rãi) */}
        <main className="flex-1 w-full flex flex-col bg-slate-100">
          <div className="w-full max-w-md md:max-w-none md:px-8 lg:px-12 mx-auto p-4 md:py-6 flex-1 pb-20 md:pb-10 transition-all">
            {children}
          </div>
        </main>

        {/* Thanh điều hướng dưới đáy (Chỉ hiển thị trên Mobile: md:hidden) */}
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
