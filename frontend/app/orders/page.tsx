'use client';

import React from 'react';
import Link from 'next/link';

export default function OrdersPage() {
  return (
    <div className="space-y-6 pb-24">
      {/* TIÊU ĐỀ TRANG */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black text-neutral-900">
            Lịch sử đơn hàng
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Theo dõi tiến độ và các đơn đồ uống đã đặt
          </p>
        </div>
      </div>

      {/* TRẠNG THÁI TRỐNG (EMPTY STATE - SRS AC-15.2) */}
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-900 shadow-inner">
          📋
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-800">
          Chưa có đơn hàng nào
        </h2>
        <p className="mt-2 max-w-xs text-xs text-neutral-500 leading-relaxed">
          Bạn chưa đặt món nào tại BrewLite. Hãy khám phá thực đơn cà phê thơm ngon và đặt ngay chỉ trong vài chạm nhé!
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-amber-900 active:scale-95"
        >
          <span>Khám phá thực đơn ngay</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
