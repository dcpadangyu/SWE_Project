"use client";

/**
 * ============================================================================
 * USER PROFILE COMPONENT (GIAO DIỆN HỒ SƠ & THÔNG TIN TÀI KHOẢN NGƯỜI DÙNG)
 * ============================================================================
 *
 * Hiển thị thông tin cá nhân của khách hàng:
 * - Họ tên, Email, Vai trò
 * - Điểm thưởng Loyalty tích lũy (Task 6 / FR-13)
 * - Đổi điểm thưởng lấy Voucher giảm giá (Task 4)
 * - Kho Voucher khả dụng kèm tính năng sao chép mã (Task 4)
 * - Nút xem lịch sử đơn hàng (/orders)
 * - Nút Đăng xuất (xóa token và session)
 */

import React, { useState } from "react";
import Link from "next/link";

export interface UserInfo {
  id?: string;
  email: string;
  fullName?: string | null;
  role?: string;
  loyaltyPoints?: number;
}

export interface VoucherItem {
  id: string;
  code: string;
  discountType: string;
  discountValue: number | string;
  minOrderValue?: number | string;
  maxDiscount?: number | string;
  endDate?: string;
}

export interface RedeemMessage {
  type: "success" | "error";
  text: string;
}

export interface UserProfileProps {
  user: UserInfo;
  onLogout: () => void;
  availableVouchers?: VoucherItem[];
  onRedeemReward?: (rewardId: string) => Promise<void>;
  isRedeeming?: boolean;
  redeemMessage?: RedeemMessage | null;
  onUpdateName?: (newName: string) => Promise<boolean>;
}

interface RewardOption {
  rewardId: string;
  points: number;
  costLabel: string;
  title: string;
  description: string;
}

const REWARD_OPTIONS: RewardOption[] = [
  {
    rewardId: "REWARD10K",
    points: 10,
    costLabel: "10 điểm",
    title: "Voucher 10.000đ",
    description: "Giảm 10.000đ áp dụng cho mọi đơn hàng",
  },
  {
    rewardId: "REWARD20K",
    points: 20,
    costLabel: "20 điểm",
    title: "Voucher 20.000đ",
    description: "Giảm 20.000đ trực tiếp khi đặt cà phê & trà",
  },
  {
    rewardId: "REWARD50K",
    points: 50,
    costLabel: "50 điểm",
    title: "Voucher 50.000đ",
    description: "Giảm 50.000đ - Siêu ưu đãi cho đơn lớn",
  },
];

const formatCurrency = (val: number | string): string => {
  const num = Number(val);
  if (isNaN(num)) return `${val}`;
  return `${num.toLocaleString("vi-VN")}đ`;
};

const formatDiscount = (voucher: VoucherItem): string => {
  if (voucher.discountType === "PERCENTAGE") {
    const max = voucher.maxDiscount
      ? ` (tối đa ${formatCurrency(voucher.maxDiscount)})`
      : "";
    return `Giảm ${voucher.discountValue}%${max}`;
  }
  return `Giảm ${formatCurrency(voucher.discountValue)}`;
};

const formatMinOrder = (minOrder?: number | string): string => {
  const min = Number(minOrder || 0);
  if (min > 0) {
    return `Đơn tối thiểu ${min.toLocaleString("vi-VN")}đ`;
  }
  return "Không giới hạn đơn tối thiểu";
};

const formatExpiryDate = (dateStr?: string): string => {
  if (!dateStr) return "Vô thời hạn";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Vô thời hạn";
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Vô thời hạn";
  }
};

export default function UserProfile({
  user,
  onLogout,
  availableVouchers = [],
  onRedeemReward,
  isRedeeming = false,
  redeemMessage = null,
  onUpdateName,
}: UserProfileProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState(user.fullName || "");
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const displayName = user.fullName?.trim() || "Khách hàng BrewLite";
  const initialChar = displayName.charAt(0).toUpperCase();
  const loyaltyPoints = user.loyaltyPoints ?? 0;
  const roleLabel =
    user.role === "ADMIN" ? "Quản trị viên" : "Khách hàng thân thiết";

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameInput.trim()) {
      setNameError("Vui lòng nhập họ và tên.");
      return;
    }
    setIsSubmittingName(true);
    setNameError(null);
    try {
      if (onUpdateName) {
        const success = await onUpdateName(editNameInput.trim());
        if (success) {
          setIsEditingName(false);
        } else {
          setNameError("Không thể cập nhật họ tên. Vui lòng thử lại.");
        }
      }
    } catch {
      setNameError("Có lỗi xảy ra khi lưu họ tên.");
    } finally {
      setIsSubmittingName(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2000);
    } catch {
      // Bỏ qua lỗi copy nếu trình duyệt chặn
    }
  };

  return (
    <div className="space-y-5 pb-6 pt-1 w-full">
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
              <div className="flex items-center space-x-3">
                <h2 className="truncate text-xl font-bold text-amber-50">
                  {displayName}
                </h2>
                {onUpdateName && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameInput(user.fullName || "");
                      setNameError(null);
                      setIsEditingName(true);
                    }}
                    className="inline-flex items-center space-x-1 rounded-lg bg-amber-700/80 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-600 transition"
                    title="Chỉnh sửa họ tên"
                  >
                    <span>✏️ Đổi tên</span>
                  </button>
                )}
              </div>
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
            hàng. Dùng điểm để đổi voucher giảm giá bên dưới!
          </p>
        </div>
      </div>

      {/* SECTION 1: ĐỔI ĐIỂM THƯỞNG LẤY MÃ GIẢM GIÁ (LOYALTY REWARDS) */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 bg-gradient-to-r from-amber-900 to-amber-850 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700/80 text-lg shadow-sm">
                🎁
              </span>
              <div>
                <h3 className="text-base font-bold text-amber-50">
                  Đổi Điểm Thưởng Lấy Mã Giảm Giá
                </h3>
                <p className="text-xs text-amber-200">
                  Loyalty Rewards • Đổi điểm tích lũy nhận ưu đãi tức thì
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-amber-200">Điểm hiện có</span>
              <span className="text-lg font-black text-amber-300">
                {loyaltyPoints} <span className="text-xs font-semibold">điểm</span>
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Thông báo kết quả đổi điểm */}
          {redeemMessage && (
            <div
              className={`flex items-start space-x-2.5 rounded-xl border p-3.5 text-xs font-medium ${
                redeemMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              <span className="text-base leading-none">
                {redeemMessage.type === "success" ? "🎉" : "⚠️"}
              </span>
              <div className="flex-1 leading-relaxed">{redeemMessage.text}</div>
            </div>
          )}

          {/* 3 Thẻ đổi voucher */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {REWARD_OPTIONS.map((reward) => {
              const canAfford = loyaltyPoints >= reward.points;
              return (
                <div
                  key={reward.rewardId}
                  className={`relative flex flex-col justify-between rounded-xl border p-4 transition ${
                    canAfford
                      ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:shadow-sm"
                      : "border-stone-200 bg-stone-50/70 opacity-80"
                  }`}
                >
                  <div>
                    {/* Badge chi phí điểm */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
                        {reward.costLabel}
                      </span>
                      <span className="text-[11px] font-medium text-stone-500">
                        {canAfford
                          ? "Đủ điểm"
                          : `Thiếu ${reward.points - loyaltyPoints} đ`}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900">
                      {reward.title}
                    </h4>
                    <p className="mt-1 text-xs text-stone-500">
                      {reward.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRedeemReward?.(reward.rewardId)}
                    disabled={!canAfford || isRedeeming}
                    className={`mt-4 w-full rounded-lg py-2 px-3 text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      canAfford && !isRedeeming
                        ? "bg-amber-800 text-white hover:bg-amber-900 active:scale-[0.98] shadow-sm cursor-pointer"
                        : "cursor-not-allowed bg-stone-200 text-stone-400"
                    }`}
                  >
                    {isRedeeming ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                        <span>Đang đổi...</span>
                      </>
                    ) : (
                      <>
                        <span>Đổi mã</span>
                        <span>➔</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: KHO VOUCHER CỦA BẠN (MÃ GIẢM GIÁ KHẢ DỤNG) */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-900 shadow-sm">
              🎟️
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Kho Voucher Của Bạn
              </h3>
              <p className="text-xs text-stone-500">
                Mã giảm giá khả dụng khi đặt hàng tại BrewLite
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
            {availableVouchers.length} mã
          </span>
        </div>

        <div className="p-5">
          {availableVouchers.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-3xl">🎫</span>
              <p className="mt-2 text-sm font-medium text-stone-600">
                Chưa có mã giảm giá nào
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Hãy tích lũy điểm thưởng từ các đơn hàng để đổi voucher ưu đãi!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableVouchers.map((voucher) => {
                const isCopied = copiedCode === voucher.code;
                return (
                  <div
                    key={voucher.id}
                    className="relative flex flex-col justify-between rounded-xl border border-dashed border-amber-300 bg-amber-50/30 p-4 transition hover:bg-amber-50/60 hover:shadow-sm"
                  >
                    <div>
                      {/* Code badge và Nút sao chép */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block rounded-md bg-amber-100/90 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-amber-950 border border-amber-300">
                          {voucher.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(voucher.code)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center space-x-1 ${
                            isCopied
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                          }`}
                        >
                          <span>{isCopied ? "Đã chép! ✓" : "Sao chép"}</span>
                        </button>
                      </div>

                      {/* Thông tin mức giảm */}
                      <div className="mt-3">
                        <p className="text-sm font-bold text-stone-900">
                          {formatDiscount(voucher)}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {formatMinOrder(voucher.minOrderValue)}
                        </p>
                      </div>
                    </div>

                    {/* Hạn sử dụng */}
                    <div className="mt-3 pt-2.5 border-t border-amber-200/50 flex items-center justify-between text-[11px] text-stone-500">
                      <span>Hạn sử dụng:</span>
                      <span className="font-semibold text-stone-700">
                        {formatExpiryDate(voucher.endDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TÁC VỤ & ĐĂNG XUẤT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DANH SÁCH TÁC VỤ & TIỆN ÍCH */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100 p-2">
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
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-stone-500 mb-3 hidden md:block">
            Đăng xuất tài khoản khỏi trình duyệt này để bảo mật thông tin cá nhân và điểm thưởng.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center space-x-2 rounded-xl border border-red-200 bg-red-50/50 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 active:scale-[0.99] cursor-pointer"
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

      {/* MODAL ĐỔI TÊN NGƯỜI DÙNG */}
      {isEditingName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                Chỉnh sửa họ và tên
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveName} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600">
                  Họ và tên mới
                </label>
                <input
                  type="text"
                  required
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
                {nameError && (
                  <p className="mt-1 text-xs text-red-600">{nameError}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingName}
                  onClick={() => setIsEditingName(false)}
                  className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingName}
                  className="flex-1 rounded-xl bg-amber-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {isSubmittingName ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
