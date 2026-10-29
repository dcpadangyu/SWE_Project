import { BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

const USER = 'u0000000-0000-4000-8000-000000000001';
const PRODUCT = 'a0000000-0000-4000-8000-000000000001';

const D = (v: number) => new Prisma.Decimal(v);

const product = {
  id: PRODUCT,
  name: 'Trà đào',
  priceS: D(34000),
  priceM: D(39000),
  priceL: D(44000),
  toppingOptions: [{ id: 'jelly', name: 'Thạch', price: '5000.00', isAvailable: true }],
  stock: 5,
  isAvailable: true,
};

function storedOrder(over: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 1042,
    userId: USER,
    status: 'PENDING',
    subtotal: D(78000),
    discountAmount: D(0),
    totalAmount: D(78000),
    note: null,
    checkoutKey: 'key-1',
    createdAt: new Date('2026-10-27T00:00:00Z'),
    updatedAt: new Date('2026-10-27T00:00:00Z'),
    items: [
      {
        id: 'i1',
        orderId: 'order-1',
        productId: PRODUCT,
        productName: 'Trà đào',
        size: 'M',
        quantity: 2,
        selectedToppings: [],
        unitPrice: D(39000),
        subtotal: D(78000),
      },
    ],
    ...over,
  };
}

function makeService() {
  const tx = {
    product: {
      findMany: jest.fn().mockResolvedValue([product]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    order: { create: jest.fn() },
  };
  const prisma = {
    order: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  const service = new OrdersService(prisma as never);
  return { service, prisma, tx };
}

const dto = (over: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
  items: [{ productId: PRODUCT, size: 'M', quantity: 2 }],
  ...over,
});

describe('OrdersService.create', () => {
  it('tạo đơn PENDING, backend tự tính tiền và lưu snapshot', async () => {
    const { service, tx } = makeService();
    tx.order.create.mockResolvedValue(storedOrder());

    const result = await service.create(USER, 'key-1', dto());

    expect(result.replayed).toBe(false);
    expect(result.order.orderCode).toBe('#1042');
    expect(result.order.status).toBe('PENDING');
    expect(result.order.totalAmount).toBe('78000.00');

    const data = tx.order.create.mock.calls[0][0].data;
    expect(data.subtotal).toBe(78000);
    expect(data.totalAmount).toBe(78000);
    expect(data.userId).toBe(USER);
    expect(data.checkoutKey).toBe('key-1');
    expect(data.items.create[0]).toMatchObject({
      productName: 'Trà đào',
      unitPrice: 39000,
      subtotal: 78000,
    });
    // Chỉ kiểm tra tồn kho, không trừ kho
    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('gửi lại cùng Idempotency-Key thì trả đơn cũ, không tạo đơn mới', async () => {
    const { service, prisma, tx } = makeService();
    prisma.order.findFirst.mockResolvedValue(storedOrder());

    const result = await service.create(USER, 'key-1', dto());

    expect(result.replayed).toBe(true);
    expect(result.order.orderId).toBe('order-1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('hai request song song cùng khóa: bắt lỗi unique rồi trả đơn đã có', async () => {
    const { service, prisma, tx } = makeService();
    prisma.order.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedOrder());
    tx.order.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.create(USER, 'key-1', dto());
    expect(result.replayed).toBe(true);
  });

  it('khóa đã thuộc người dùng khác thì trả 409, không lộ đơn của họ', async () => {
    const { service, prisma, tx } = makeService();
    prisma.order.findFirst.mockResolvedValue(null);
    tx.order.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.create(USER, 'key-1', dto())).rejects.toThrow(ConflictException);
  });

  it('hết hàng thì 409 và không lưu đơn nào', async () => {
    const { service, tx } = makeService();
    await expect(
      service.create(USER, 'key-2', dto({ items: [{ productId: PRODUCT, size: 'M', quantity: 6 }] })),
    ).rejects.toThrow(ConflictException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('sản phẩm không tồn tại thì 400', async () => {
    const { service, tx } = makeService();
    tx.product.findMany.mockResolvedValue([]);
    await expect(service.create(USER, 'key-3', dto())).rejects.toThrow(BadRequestException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});

describe('CreateOrderDto + ValidationPipe toàn cục', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const run = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: CreateOrderDto });

  const valid = { items: [{ productId: PRODUCT, size: 'M', quantity: 1 }] };

  it('chấp nhận payload hợp lệ', async () => {
    await expect(run(valid)).resolves.toBeInstanceOf(CreateOrderDto);
  });

  it.each([
    ['giỏ rỗng', { items: [] }],
    ['thiếu items', {}],
    ['quantity = 0', { items: [{ productId: PRODUCT, size: 'M', quantity: 0 }] }],
    ['quantity không nguyên', { items: [{ productId: PRODUCT, size: 'M', quantity: 1.5 }] }],
    ['size sai', { items: [{ productId: PRODUCT, size: 'XL', quantity: 1 }] }],
    ['productId không phải UUID', { items: [{ productId: '123', size: 'M', quantity: 1 }] }],
    ['topping trùng', { items: [{ productId: PRODUCT, size: 'M', quantity: 1, toppingIds: ['a', 'a'] }] }],
  ])('từ chối: %s', async (_name, body) => {
    await expect(run(body)).rejects.toThrow(BadRequestException);
  });

  it('từ chối khi client gửi tổng tiền (AC-12.3)', async () => {
    await expect(run({ ...valid, total: 1000 })).rejects.toThrow(BadRequestException);
    await expect(
      run({ items: [{ productId: PRODUCT, size: 'M', quantity: 1, unitPrice: 1 }] }),
    ).rejects.toThrow(BadRequestException);
  });
});
