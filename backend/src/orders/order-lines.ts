import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  calculateItemPrice,
  calculateLineSubtotal,
} from '../common/utils/pricing.util';
import type { SelectedTopping, ToppingOption } from '../common/types/brewlite';
import type { CreateOrderItemDto, OrderSize } from './dto/create-order.dto';

type MoneyLike = number | string | { toString(): string };

/** Phần dữ liệu sản phẩm (đọc từ DB) mà việc tính đơn cần dùng. */
export interface ProductForOrder {
  id: string;
  name: string;
  priceS: MoneyLike;
  priceM: MoneyLike;
  priceL: MoneyLike;
  toppingOptions: unknown;
  stock: number;
  isAvailable: boolean;
}

/** Một dòng đơn đã được backend định giá, sẵn sàng lưu vào order_items. */
export interface OrderLine {
  productId: string;
  productName: string;
  size: OrderSize;
  quantity: number;
  selectedToppings: SelectedTopping[];
  unitPrice: number;
  subtotal: number;
}

const toNumber = (value: MoneyLike): number => Number(String(value));

function parseToppingOptions(raw: unknown): ToppingOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is Record<string, unknown> =>
        typeof t === 'object' && t !== null && 'id' in t,
    )
    .map((t) => ({
      id: String(t.id as string | number),
      name: typeof t.name === 'string' ? t.name : '',
      price: toNumber((t.price ?? 0) as MoneyLike),
      isAvailable: t.isAvailable !== false,
    }));
}

/**
 * Biến các dòng giỏ hàng của client thành các dòng đơn đã định giá.
 * Hàm thuần (không gọi DB). Mọi giá lấy từ `products`, không tin client (AC-12.3).
 *
 * @throws BadRequestException khi sản phẩm không tồn tại / ngừng bán / topping sai.
 */
export function buildOrderLines(
  items: CreateOrderItemDto[],
  products: Map<string, ProductForOrder>,
): OrderLine[] {
  return items.map((item) => {
    const product = products.get(item.productId);
    if (!product) {
      throw new BadRequestException(
        `Sản phẩm ${item.productId} không tồn tại.`,
      );
    }
    if (!product.isAvailable) {
      throw new BadRequestException(`Sản phẩm "${product.name}" đã ngừng bán.`);
    }

    const options = parseToppingOptions(product.toppingOptions);
    const selectedToppings: SelectedTopping[] = (item.toppingIds ?? []).map(
      (toppingId) => {
        const option = options.find((o) => o.id === toppingId);
        if (!option || !option.isAvailable) {
          throw new BadRequestException(
            `Topping "${toppingId}" không hợp lệ cho "${product.name}".`,
          );
        }
        return { id: option.id, name: option.name, price: option.price };
      },
    );

    const unitPrice = calculateItemPrice(
      {
        ...product,
        priceS: toNumber(product.priceS),
        priceM: toNumber(product.priceM),
        priceL: toNumber(product.priceL),
        toppingOptions: options,
      },
      item.size,
      selectedToppings,
    );

    return {
      productId: product.id,
      productName: product.name,
      size: item.size,
      quantity: item.quantity,
      selectedToppings,
      unitPrice,
      subtotal: calculateLineSubtotal(unitPrice, item.quantity),
    };
  });
}

/**
 * Kiểm tra tồn kho. Cộng dồn số ly theo productId, vì các dòng khác size/topping
 * của cùng một món dùng chung một kho (AC-06.11). Chỉ kiểm tra, KHÔNG trừ kho
 * (việc trừ kho diễn ra khi thanh toán thành công).
 *
 * @throws ConflictException (409, code OUT_OF_STOCK) kèm danh sách món thiếu.
 */
export function assertStockAvailable(
  lines: OrderLine[],
  products: Map<string, ProductForOrder>,
): void {
  const needed = new Map<string, number>();
  for (const line of lines) {
    needed.set(line.productId, (needed.get(line.productId) ?? 0) + line.quantity);
  }

  const outOfStock = [...needed]
    .map(([productId, requested]) => {
      const product = products.get(productId)!;
      return {
        productId,
        name: product.name,
        requested,
        remaining: product.stock,
      };
    })
    .filter((x) => x.requested > x.remaining);

  if (outOfStock.length > 0) {
    const first = outOfStock[0];
    throw new ConflictException({
      code: 'OUT_OF_STOCK',
      message:
        first.remaining > 0
          ? `Món "${first.name}" chỉ còn ${first.remaining} ly.`
          : `Món "${first.name}" đã hết hàng.`,
      details: { outOfStock },
    });
  }
}
