import { BadRequestException, ConflictException } from '@nestjs/common';
import type { CreateOrderItemDto } from './dto/create-order.dto';
import {
  assertStockAvailable,
  buildOrderLines,
  ProductForOrder,
} from './order-lines';

const PRODUCT_A = 'a0000000-0000-4000-8000-000000000001';
const PRODUCT_B = 'b0000000-0000-4000-8000-000000000002';

function makeProducts(): Map<string, ProductForOrder> {
  return new Map<string, ProductForOrder>([
    [
      PRODUCT_A,
      {
        id: PRODUCT_A,
        name: 'Trà đào',
        priceS: '34000.00',
        priceM: '39000.00',
        priceL: '44000.00',
        toppingOptions: [
          { id: 'extra-peach', name: 'Thêm đào', price: '8000.00', isAvailable: true },
          { id: 'jelly', name: 'Thạch', price: '5000.00', isAvailable: true },
          { id: 'off', name: 'Hết topping', price: '1000.00', isAvailable: false },
        ],
        stock: 5,
        isAvailable: true,
      },
    ],
    [
      PRODUCT_B,
      {
        id: PRODUCT_B,
        name: 'Trà sen',
        priceS: 35000,
        priceM: 40000,
        priceL: 45000,
        toppingOptions: [],
        stock: 10,
        isAvailable: false,
      },
    ],
  ]);
}

const item = (over: Partial<CreateOrderItemDto> = {}): CreateOrderItemDto => ({
  productId: PRODUCT_A,
  size: 'M',
  quantity: 1,
  ...over,
});

describe('buildOrderLines', () => {
  it('tính unitPrice = giá size + topping và subtotal = unitPrice x quantity', () => {
    const [line] = buildOrderLines(
      [item({ size: 'L', toppingIds: ['extra-peach', 'jelly'], quantity: 2 })],
      makeProducts(),
    );
    expect(line.unitPrice).toBe(44000 + 8000 + 5000);
    expect(line.subtotal).toBe(57000 * 2);
    expect(line.productName).toBe('Trà đào');
    expect(line.selectedToppings.map((t) => t.id)).toEqual(['extra-peach', 'jelly']);
  });

  it('không có topping thì chỉ tính giá size', () => {
    const [line] = buildOrderLines([item({ size: 'S' })], makeProducts());
    expect(line.unitPrice).toBe(34000);
    expect(line.selectedToppings).toEqual([]);
  });

  it('từ chối sản phẩm không tồn tại', () => {
    expect(() =>
      buildOrderLines(
        [item({ productId: 'c0000000-0000-4000-8000-000000000003' })],
        makeProducts(),
      ),
    ).toThrow(BadRequestException);
  });

  it('từ chối sản phẩm ngừng bán', () => {
    expect(() =>
      buildOrderLines([item({ productId: PRODUCT_B })], makeProducts()),
    ).toThrow(BadRequestException);
  });

  it('từ chối topping không thuộc sản phẩm hoặc đã hết', () => {
    expect(() =>
      buildOrderLines([item({ toppingIds: ['khong-co'] })], makeProducts()),
    ).toThrow(BadRequestException);
    expect(() =>
      buildOrderLines([item({ toppingIds: ['off'] })], makeProducts()),
    ).toThrow(BadRequestException);
  });
});

describe('assertStockAvailable', () => {
  it('cho qua khi tổng số ly không vượt tồn kho', () => {
    const products = makeProducts();
    const lines = buildOrderLines(
      [item({ quantity: 2 }), item({ size: 'L', quantity: 3 })],
      products,
    );
    expect(() => assertStockAvailable(lines, products)).not.toThrow();
  });

  it('cộng dồn các dòng cùng productId: từng dòng đủ nhưng tổng vượt thì bị chặn', () => {
    const products = makeProducts(); // stock = 5
    const lines = buildOrderLines(
      [item({ size: 'S', quantity: 3 }), item({ size: 'L', quantity: 3 })],
      products,
    );
    expect(() => assertStockAvailable(lines, products)).toThrow(ConflictException);
  });

  it('409 kèm mã OUT_OF_STOCK và danh sách món thiếu', () => {
    const products = makeProducts();
    const lines = buildOrderLines([item({ quantity: 9 })], products);
    try {
      assertStockAvailable(lines, products);
      fail('phải ném ConflictException');
    } catch (e) {
      const body = (e as ConflictException).getResponse() as {
        code: string;
        details: { outOfStock: { productId: string; remaining: number }[] };
      };
      expect(body.code).toBe('OUT_OF_STOCK');
      expect(body.details.outOfStock[0]).toMatchObject({
        productId: PRODUCT_A,
        remaining: 5,
      });
    }
  });
});
