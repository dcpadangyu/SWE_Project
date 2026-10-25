/**
 * ============================================================================
 * ROOT LAYOUT (KHUNG GIAO DIỆN GỐC DÙNG CHUNG CỦA ỨNG DỤNG)
 * ============================================================================
 * 
 * Mục đích:
 * - Thiết lập cấu trúc giao diện Mobile-first bám sát Wireframe Mục 7.
 * - Khung hiển thị trung tâm mô phỏng màn hình điện thoại (max-w-md, shadow-2xl)
 *   giúp ứng dụng hiển thị hoàn hảo trên cả điện thoại thực tế lẫn màn hình máy tính.
 * - Tích hợp Header (Logo + Cart Badge) và Bottom Navigation (4 tabs).
 */

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

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
      <body className="min-h-full bg-slate-100 text-slate-800 flex justify-center selection:bg-amber-500 selection:text-white">
        {/* KHUNG MÀN HÌNH DI ĐỘNG (MOBILE-FIRST CONTAINER) */}
        <div className="w-full max-w-md min-h-screen bg-white shadow-2xl flex flex-col relative pb-16">
          {/* Header trên cùng (Logo & Cart Badge) */}
          <Header />

          {/* Nội dung trang con (Menu, Giỏ hàng, Chi tiết món...) */}
          <main className="flex-1 p-4 overflow-y-auto">{children}</main>

          {/* Thanh điều hướng dưới đáy (Menu, Cart, Orders, Profile) */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
