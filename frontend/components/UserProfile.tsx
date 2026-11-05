"use client";

/**
 * ============================================================================
 * USER PROFILE COMPONENT (GIAO DIỆN HỒ SƠ & THÔNG TIN TÀI KHOẢN NGƯỜI DÙNG)
 * ============================================================================
 *
 * Hiển thị thông tin cá nhân của khách hàng:
 * - Họ tên, Email, Vai trò
 * - Điểm thưởng Loyalty tích lũy (Task 6 / FR-13)
 * - Nút xem lịch sử đơn hàng (/orders)
 * - Nút Đăng xuất (xóa token và session)
 */

import React from "react";
import Link from "next/link";

export interface UserInfo {
  id?: string;
  email: string;
  fullName?: string | null;
  role?: string;
  loyaltyPoints?: number;
}

interface UserProfileProps {
  user: UserInfo;
  onLogout: () => void;
}

export default function UserProfile({ user, onLogout }: UserProfileProps) {
  const displayName = user.fullName?.trim() || "Khách hàng BrewLite";
  const initialChar = displayName.charAt(0).toUpperCase();
  const loyaltyPoints = user.loyaltyPoints ?? 0;
  const roleLabel =
    user.role === "ADMIN" ? "Quản trị viên" : "Khách hàng thân thiết";

  return (
    <div className="space-y-4 pb-20 pt-2">
      {/* THẺ PROFILE CHÍNH */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {/* Nền Header Thẻ */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 px-6 py-6 text-white">
          <div className="flex items-center space-x-4">
            {/* Avatar chữ cái đầu */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500 text-2xl font-black text-amber-950 shadow-md">
              {initialChar}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-amber-50">
                {displayName}
              </h2>
              <p className="truncate text-xs text-amber-200">{user.email}</p>
              <div className="mt-2 inline-flex items-center rounded-full bg-amber-700/60 px-2.5 py-0.5 text-[11px] font-medium text-amber-100">
                {roleLabel}
              </div>
            </div>
          </div>
        </div>

        {/* THẺ ĐIỂM THƯỞNG TÍCH LŨY (LOYALTY POINTS) */}
        <div className="border-b border-stone-100 bg-amber-50/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Điểm thưởng BrewLite
              </p>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-amber-900">
                  {loyaltyPoints}
                </span>
                <span className="text-xs font-bold text-amber-800">điểm</span>
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200/70 text-2xl shadow-inner">
              ⭐
            </div>
          </div>
          <p className="mt-2 text-[11px] text-stone-500">
            Tự động tích 1 điểm cho mỗi 10.000đ khi hoàn tất thanh toán đơn
            hàng.
          </p>
        </div>

        {/* DANH SÁCH TÁC VỤ & TIỆN ÍCH */}
        <div className="divide-y divide-stone-100 p-2">
          {/* Lịch sử đơn hàng */}
          <Link
            href="/orders"
            className="flex items-center justify-between rounded-xl px-4 py-3.5 text-stone-700 transition hover:bg-stone-50"
          >
            <div className="flex items-center space-x-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-lg text-amber-900">
                📋
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-800">
                  Lịch sử đơn hàng
                </p>
                <p className="text-xs text-stone-400">
                  Theo dõi tiến độ và các đơn đồ uống đã đặt
                </p>
              </div>
            </div>
            <span className="text-stone-400">→</span>
          </Link>

          {/* Đặt món */}
          <Link
            href="/"
            className="flex items-center justify-between rounded-xl px-4 py-3.5 text-stone-700 transition hover:bg-stone-50"
          >
            <div className="flex items-center space-x-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-lg text-amber-900">
                ☕
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-800">
                  Thực đơn cà phê
                </p>
                <p className="text-xs text-stone-400">
                  Khám phá đồ uống thơm ngon và đặt ngay
                </p>
              </div>
            </div>
            <span className="text-stone-400">→</span>
          </Link>
        </div>

        {/* NÚT ĐĂNG XUẤT */}
        <div className="border-t border-stone-100 p-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center space-x-2 rounded-xl border border-red-200 bg-red-50/50 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 active:scale-[0.99]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </div>
  );
}
