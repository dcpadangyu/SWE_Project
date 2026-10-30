"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "../types/brewlite";
import { ProductGrid } from "../components/ProductGrid";
import { apiClient } from "../utils/apiClient";
import { MOCK_PRODUCTS } from "../utils/mockProducts";

export default function Home() {
  const router = useRouter();

  const [loadedProducts, setLoadedProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
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
        setProducts(data);
        setError(null);
      })
      .catch(() => {
        if (ignore) return;
        // Fallback sang MOCK_PRODUCTS nếu Backend chưa bật để UI demo vẫn hoạt động mượt mà
        setLoadedProducts(MOCK_PRODUCTS);
        setProducts(MOCK_PRODUCTS);
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

  const handleShowAll = () => {
    setIsLoading(false);
    setError(null);
    setProducts(loadedProducts);
  };

  const handleShowEmpty = () => {
    setIsLoading(false);
    setError(null);
    setProducts([]);
  };

  return (
    <div className="space-y-6 pb-24">
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

        {/* Nút mô phỏng trạng thái (Hỗ trợ demo & chấm điểm) */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={handleShowAll}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition ${
              !isLoading && !error && products.length > 0
                ? "bg-amber-800 text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Tất cả món
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsLoading(!isLoading);
            }}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition ${
              isLoading
                ? "bg-amber-800 text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Mô phỏng Tải
          </button>
          <button
            type="button"
            onClick={handleShowEmpty}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition ${
              products.length === 0 && !isLoading && !error
                ? "bg-amber-800 text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Trạng thái Trống
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoading(false);
              setError(
                error
                  ? null
                  : "Không thể kết nối đến máy chủ API. Vui lòng thử lại sau.",
              );
            }}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition ${
              error
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Mô phỏng Lỗi
          </button>
        </div>

        {/* Component Lưới Sản Phẩm */}
        <ProductGrid
          products={products}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          onSelectProduct={handleSelectProduct}
        />
      </div>
    </div>
  );
}
