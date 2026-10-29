import React from "react";
import { Product } from "../types/brewlite";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isLoading,
  error,
  onRetry,
  onSelectProduct,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="bg-white rounded-xl border border-neutral-200 p-3 flex flex-col gap-2 animate-pulse"
          >
            <div className="w-full h-36 bg-neutral-200 rounded-lg" />
            <div className="h-4 bg-neutral-200 rounded w-3/4 mt-1" />
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
            <div className="h-7 bg-neutral-200 rounded w-full mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-red-200 text-center my-4">
        <p className="text-red-600 text-sm font-medium mb-3">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-1.5 bg-amber-800 text-white text-xs font-medium rounded-lg hover:bg-amber-900 transition"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-neutral-200 text-center my-4">
        <p className="text-neutral-500 text-sm font-medium">
          Hiện tại chưa có sản phẩm nào trong danh mục.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelectProduct}
        />
      ))}
    </div>
  );
};
