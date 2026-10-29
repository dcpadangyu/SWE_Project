"use client";

import React, { useState } from "react";
import { Product } from "../types/brewlite";
import { ProductGrid } from "../components/ProductGrid";

/**
 * MẢNG DỮ LIỆU MẪU (MOCK DATA)
 * Sử dụng tạm thời để kiểm thử UI trong Task 3 trước khi tích hợp API.
 */
const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-01",
    name: "Cà phê sữa",
    priceS: 35000,
    priceM: 40000,
    priceL: 45000,
    toppingOptions: [],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
    stock: 20,
    description: "Cà phê pha phin truyền thống kết hợp sữa đặc ngọt thanh.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-02",
    name: "Americano",
    priceS: 40000,
    priceM: 45000,
    priceL: 50000,
    toppingOptions: [],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=60",
    stock: 15,
    description: "Espresso pha loãng với nước nóng, giữ nguyên vị đậm đà.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-03",
    name: "Cappuccino",
    priceS: 45000,
    priceM: 50000,
    priceL: 55000,
    toppingOptions: [],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60",
    stock: 10,
    description: "Espresso hòa quyện lớp sữa nóng và bọt sữa bồng bềnh.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-04",
    name: "Trà đào",
    priceS: 39000,
    priceM: 44000,
    priceL: 49000,
    toppingOptions: [],
    isAvailable: false,
    imageUrl:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60",
    stock: 0,
    description: "Trà thanh mát kết hợp đào ngâm giòn ngọt thơm lừng.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function Home() {
  // Quản lý các trạng thái hiển thị
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectProduct = (product: Product) => {
    alert(
      `Đã chọn món: ${product.name} - Giá: ${product.priceS.toLocaleString("vi-VN")} đ`,
    );
  };

  const handleShowAll = () => {
    setIsLoading(false);
    setError(null);
    setProducts(MOCK_PRODUCTS);
  };

  const handleShowEmpty = () => {
    setIsLoading(false);
    setError(null);
    setProducts([]);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* BANNER CHÀO MỪNG (Giữ nguyên từ bản gốc của Leader) */}
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

      {/* KHU VỰC THỰC ĐƠN (Ghi đè khối trạng thái cũ) */}
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

        {/* Nút mô phỏng trạng thái (Hỗ trợ chấm điểm Task 3) */}
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
          onRetry={handleShowAll}
          onSelectProduct={handleSelectProduct}
        />
      </div>
    </div>
  );
}
