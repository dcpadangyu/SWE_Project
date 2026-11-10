"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "../types/brewlite";
import { ProductGrid } from "../components/ProductGrid";
import PromoBannerSlider from "@/components/PromoBannerSlider";
import { apiClient } from "../utils/apiClient";
import { MOCK_PRODUCTS } from "../utils/mockProducts";

const CATEGORIES = [
  { id: "ALL", label: "Tất cả món" },
  { id: "COFFEE", label: "Cà phê" },
  { id: "TEA", label: "Trà & Khác" },
];

export default function Home() {
  const router = useRouter();

  const [loadedProducts, setLoadedProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  useEffect(() => {
    let ignore = false;
    apiClient
      .get<Product[]>("/products")
      .then((data) => {
        if (ignore) return;
        setLoadedProducts(data);
        setError(null);
      })
      .catch(() => {
        if (ignore) return;
        // Fallback sang MOCK_PRODUCTS nếu Backend chưa bật kèm thông báo cảnh báo lỗi
        setLoadedProducts(MOCK_PRODUCTS);
        setError("Không thể kết nối đến máy chủ API. Đang hiển thị thực đơn mẫu.");
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  // Điều hướng sang trang chi tiết món để chọn Size & Topping
  const handleSelectProduct = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const filteredProducts = loadedProducts.filter((product) => {
    if (selectedCategory === "ALL") return true;
    const cat = (product.category || "").toUpperCase();
    const name = product.name.toLowerCase();
    if (selectedCategory === "COFFEE") {
      return (
        cat.includes("COFFEE") ||
        cat.includes("CÀ PHÊ") ||
        name.includes("cà phê") ||
        name.includes("cappuccino") ||
        name.includes("americano") ||
        name.includes("bạc xỉu")
      );
    }
    if (selectedCategory === "TEA") {
      return cat.includes("TEA") || cat.includes("TRÀ") || name.includes("trà");
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* BANNER KHUYẾN MÃI CAROUSEL */}
      <PromoBannerSlider />

      {/* CẢNH BÁO KẾT NỐI API (ERROR/WARNING STATE) */}
      {error && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="shrink-0 inline-flex items-center rounded-lg bg-amber-800 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-900 active:scale-95"
          >
            Thử lại ↻
          </button>
        </div>
      )}

      {/* KHU VỰC THỰC ĐƠN */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              Thực đơn nổi bật
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Chọn món yêu thích của bạn
            </p>
          </div>
        </div>

        {/* Bộ lọc danh mục sản phẩm */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition ${
                  isActive
                    ? "bg-amber-800 text-white shadow-sm"
                    : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Component Lưới Sản Phẩm */}
        <ProductGrid
          products={filteredProducts}
          isLoading={isLoading}
          error={null}
          onRetry={handleRetry}
          onSelectProduct={handleSelectProduct}
        />
      </div>
    </div>
  );
}
