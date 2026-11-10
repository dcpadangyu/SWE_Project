"use client";

import React, { useState, useEffect, useCallback } from "react";

interface BannerItem {
  id: string;
  badge: string;
  title: string;
  discount: string;
  condition: string;
  code: string;
  gradientClass: string;
}

const BANNERS: BannerItem[] = [
  {
    id: "welcome10",
    badge: "Thành viên mới ✨",
    title: "Chào mừng thành viên mới",
    discount: "Giảm 10% (tối đa 20.000đ)",
    condition: "Áp dụng cho đơn hàng từ 50.000đ",
    code: "WELCOME10",
    gradientClass: "bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950",
  },
  {
    id: "freeship",
    badge: "Giao tận nơi 🛵",
    title: "Miễn phí giao nước tận nơi",
    discount: "Freeship 15.000đ",
    condition: "Áp dụng cho đơn hàng từ 70.000đ",
    code: "FREESHIP",
    gradientClass: "bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-950",
  },
  {
    id: "brew20k",
    badge: "Cà phê mỗi ngày ☕",
    title: "Thưởng thức cà phê mỗi ngày",
    discount: "Giảm trực tiếp 20.000đ",
    condition: "Áp dụng cho đơn từ 100.000đ",
    code: "BREW20K",
    gradientClass: "bg-gradient-to-r from-orange-800 via-amber-900 to-stone-900",
  },
];

export function PromoBannerSlider() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Touch tracking state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  }, []);

  // Auto-play: changes slide every 4.5 seconds (pauses on mouseEnter / touch)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, handleNext, currentIndex]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsPaused(true);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchDeltaX(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX === null) return;
    // deltaX < -40px -> next slide; deltaX > 40px -> prev slide
    if (touchDeltaX < -40) {
      handleNext();
    } else if (touchDeltaX > 40) {
      handlePrev();
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
  };

  // Copy voucher code with visual feedback
  const handleCopyCode = async (code: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else if (typeof document !== "undefined") {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2500);
    } catch (err) {
      console.error("Failed to copy voucher code:", err);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-md select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Khuyến mãi nổi bật"
    >
      {/* Slides Container */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {BANNERS.map((banner) => (
          <div
            key={banner.id}
            className={`w-full shrink-0 ${banner.gradientClass} p-5 pb-8 text-white flex flex-col justify-between min-h-[165px]`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-semibold text-white/90 border border-white/20">
                  {banner.badge}
                </span>
                <span className="text-[11px] font-medium text-white/75">
                  Voucher ưu đãi
                </span>
              </div>

              <h2 className="mt-2 text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-sm">
                {banner.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm sm:text-base font-extrabold text-amber-200">
                  {banner.discount}
                </span>
                <span className="text-xs text-white/85">
                  • {banner.condition}
                </span>
              </div>
            </div>

            {/* Bottom voucher bar */}
            <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-white/15 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">
                  Mã:
                </span>
                <span className="rounded-md bg-black/30 px-2.5 py-0.5 font-mono text-xs font-black tracking-wider text-amber-300 border border-white/15 shadow-inner">
                  {banner.code}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCode(banner.code);
                }}
                onTouchStart={(e) => e.stopPropagation()}
                aria-label={`Sao chép mã ${banner.code}`}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 ${
                  copiedCode === banner.code
                    ? "bg-emerald-500 text-white shadow-emerald-900/40 ring-1 ring-white/60"
                    : "bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 border border-white/25 active:bg-white/40"
                }`}
              >
                {copiedCode === banner.code ? "Đã sao chép! ✓" : "Sao chép mã 📋"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Previous Button */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Banner trước"
        className="absolute left-2.5 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 active:scale-90 border border-white/10 z-10"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Desktop Next Button */}
      <button
        type="button"
        onClick={handleNext}
        aria-label="Banner kế tiếp"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/45 active:scale-90 border border-white/10 z-10"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {BANNERS.map((banner, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={banner.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Đi tới banner ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isActive
                  ? "w-5 bg-white shadow-sm"
                  : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default PromoBannerSlider;
