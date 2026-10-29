import React from "react";
import { Product } from "../types/brewlite";

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
}) => {
  const isOutOfStock = product.stock === 0 || !product.isAvailable;

  const displayPrice = product.priceS || product.priceM || 0;
  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(displayPrice);

  return (
    <div
      onClick={() => !isOutOfStock && onSelect && onSelect(product)}
      className={`flex flex-col bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden transition hover:shadow-md ${
        isOutOfStock ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div className="relative w-full h-36 bg-neutral-100 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-neutral-400 text-xs">Chưa có ảnh</span>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm">
            Hết hàng
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h3 className="font-semibold text-neutral-800 text-sm line-clamp-1">
            {product.name}
          </h3>
          <p className="text-amber-800 font-bold text-sm mt-0.5">
            {formattedPrice}
          </p>
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOutOfStock && onSelect) onSelect(product);
          }}
          className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition ${
            isOutOfStock
              ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              : "bg-amber-800 text-white hover:bg-amber-900 active:scale-95"
          }`}
        >
          {isOutOfStock ? "Hết hàng" : "Chọn món"}
        </button>
      </div>
    </div>
  );
};
