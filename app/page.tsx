/**
 * ============================================================================
 * TRANG CHỦ / THỰC ĐƠN (HOME & MENU PAGE)
 * ============================================================================
 * 
 * Mục đích:
 * - Màn hình chính của khách hàng khi mở ứng dụng BrewLite.
 * - Hiển thị Banner khuyến mãi và thông báo luồng xem Menu.
 */

import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-4">
      {/* BANNER CHÀO MỪNG */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-800 to-amber-950 p-5 text-white shadow-md">
        <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
          Ưu đãi hôm nay ✨
        </span>
        <h2 className="mt-2 text-xl font-black tracking-tight">
          Cà phê ngon mỗi sớm mai
        </h2>
        <p className="mt-1 text-xs text-amber-200">
          Đặt món trực tuyến, quét mã nhận nước tại quầy trong 60 giây!
        </p>
      </div>

      {/* KHỐI TRẠNG THÁI NỀN TẢNG SPRINT 1 */}
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          ☕
        </div>
        <h3 className="mt-2 text-sm font-bold text-amber-950">
          Nền tảng BrewLite Mobile-first đã sẵn sàng!
        </h3>
        <p className="mt-1 text-xs text-amber-800/80">
          Khung Layout chung (Header, Cart Badge, Bottom Navigation) đã hoạt động.
          Sẵn sàng đón nhận danh sách Menu từ API Backend.
        </p>
      </div>
    </div>
  );
}
