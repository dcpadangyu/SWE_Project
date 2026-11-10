import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
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
    order: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
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

describe('OrdersService.findMyOrders', () => {
  const OTHER_USER = 'u0000000-0000-4000-8000-000000000002';

  it('đọc 50 đơn quá hạn mà không gọi quét hoặc mở transaction hủy đơn', async () => {
    const { prisma } = makeService();
    const expiration = { expireDueOrders: jest.fn(), expireOrder: jest.fn() };
    const service = new OrdersService(prisma as never, undefined, expiration as never);
    prisma.order.findMany.mockResolvedValue(Array.from({ length: 50 }, (_, i) =>
      storedOrder({ id: `order-${i}`, orderNumber: 1000 + i }),
    ));

    const result = await service.findMyOrders(USER);

    expect(result).toHaveLength(50);
    expect(result.every(order => order.status === 'PENDING')).toBe(true);
    expect(expiration.expireDueOrders).not.toHaveBeenCalled();
    expect(expiration.expireOrder).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
  });

  it('chỉ lọc đơn theo userId của người gọi', async () => {
    const { service, prisma } = makeService();
    prisma.order.findMany.mockResolvedValue([storedOrder()]);

    await service.findMyOrders(USER);

    expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: USER });
    expect(args.where.userId).not.toBe(OTHER_USER);
  });

  it('sắp xếp đơn mới nhất lên đầu (createdAt giảm dần)', async () => {
    const { service, prisma } = makeService();

    await service.findMyOrders(USER);

    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.orderBy[0]).toEqual({ createdAt: 'desc' });
  });

  it('lấy kèm items của từng đơn', async () => {
    const { service, prisma } = makeService();

    await service.findMyOrders(USER);

    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.include).toHaveProperty('items');
  });

  it('định dạng mỗi đơn giống POST /orders (mã đơn, tiền dạng chuỗi, items kèm topping)', async () => {
    const { service, prisma } = makeService();
    const withTopping = storedOrder();
    withTopping.items[0].selectedToppings = [
      { id: 'jelly', name: 'Thạch', price: 5000 },
    ] as never;
    prisma.order.findMany.mockResolvedValue([withTopping]);

    const result = await service.findMyOrders(USER);

    expect(result).toHaveLength(1);
    expect(result[0].orderCode).toBe('#1042');
    expect(result[0].totalAmount).toBe('78000.00');
    expect(result[0].items[0].unitPrice).toBe('39000.00');
    expect(result[0].items[0].selectedToppings).toEqual([
      { id: 'jelly', name: 'Thạch', price: 5000 },
    ]);
  });

  it('giữ nguyên thứ tự DB trả về, đơn mới đứng trước', async () => {
    const { service, prisma } = makeService();
    prisma.order.findMany.mockResolvedValue([
      storedOrder({ id: 'moi', orderNumber: 1043 }),
      storedOrder({ id: 'cu', orderNumber: 1042 }),
    ]);

    const result = await service.findMyOrders(USER);

    expect(result.map((o) => o.orderId)).toEqual(['moi', 'cu']);
  });

  it('trả mảng rỗng (không lỗi) khi user chưa có đơn nào', async () => {
    const { service, prisma } = makeService();
    prisma.order.findMany.mockResolvedValue([]);

    await expect(service.findMyOrders(USER)).resolves.toEqual([]);
  });
});

describe('OrdersService.findOneForUser', () => {
  const OTHER_USER = 'u0000000-0000-4000-8000-000000000002';

  it('vẫn xử lý hết hạn trước khi đọc chi tiết, trả trạng thái CANCELLED mới nhất', async () => {
    const { prisma } = makeService();
    prisma.order.findFirst.mockResolvedValue(storedOrder());
    const expiration = { expireOrder: jest.fn().mockImplementation(async () => {
      prisma.order.findFirst.mockResolvedValue(storedOrder({ status: 'CANCELLED' }));
      return true;
    }) };
    const service = new OrdersService(prisma as never, undefined, expiration as never);

    const result = await service.findOneForUser(USER, 'order-1');

    expect(expiration.expireOrder).toHaveBeenCalledWith('order-1', USER);
    expect(result.status).toBe('CANCELLED');
  });

  it('chủ đơn xem được chi tiết kèm items', async () => {
    const { service, prisma } = makeService();
    prisma.order.findFirst.mockResolvedValue(storedOrder());

    const result = await service.findOneForUser(USER, 'order-1');

    expect(result.orderId).toBe('order-1');
    expect(result.orderCode).toBe('#1042');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].productName).toBe('Trà đào');
  });

  it('truy vấn theo cả id đơn lẫn userId (quyền sở hữu nằm trong truy vấn)', async () => {
    const { service, prisma } = makeService();
    prisma.order.findFirst.mockResolvedValue(storedOrder());

    await service.findOneForUser(USER, 'order-1');

    const args = prisma.order.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'order-1', userId: USER });
    expect(args.include).toHaveProperty('items');
  });

  it('đơn của người khác: truy vấn kèm userId của người gọi nên không có kết quả, trả 404', async () => {
    const { service, prisma } = makeService();
    // DB thật chỉ trả null vì where có userId của OTHER_USER không khớp chủ đơn.
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.findOneForUser(OTHER_USER, 'order-1'),
    ).rejects.toThrow(NotFoundException);

    const args = prisma.order.findFirst.mock.calls[0][0];
    expect(args.where.userId).toBe(OTHER_USER);
  });

  it('đơn không tồn tại thì 404', async () => {
    const { service, prisma } = makeService();
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.findOneForUser(USER, 'khong-co'),
    ).rejects.toThrow(NotFoundException);
  });

  it('không lộ thông tin: lỗi 404 có cùng thông báo cho đơn lạ và đơn của người khác', async () => {
    const { service, prisma } = makeService();
    prisma.order.findFirst.mockResolvedValue(null);

    const err1 = await service
      .findOneForUser(USER, 'khong-co')
      .catch((e: NotFoundException) => e);
    const err2 = await service
      .findOneForUser(OTHER_USER, 'order-1')
      .catch((e: NotFoundException) => e);

    expect((err1 as NotFoundException).message).toBe(
      (err2 as NotFoundException).message,
    );
  });

  describe('updateStatus (Task 10.1 Order State Machine)', () => {
    it('chuyển trạng thái hợp lệ từ PAID sang PREPARING thành công', async () => {
      const { service, prisma } = makeService();
      const current = storedOrder({ status: OrderStatus.PAID });
      const updated = storedOrder({ status: OrderStatus.PREPARING });
      prisma.order.findUnique.mockResolvedValue(current);
      prisma.order.update.mockResolvedValue(updated);

      const result = await service.updateStatus('order-1', OrderStatus.PREPARING);

      expect(result.status).toBe(OrderStatus.PREPARING);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.PREPARING },
        include: expect.any(Object),
      });
    });

    it('chặn chuyển trạng thái sai quy tắc State Machine (PENDING -> COMPLETED) ném ConflictException', async () => {
      const { service, prisma } = makeService();
      const current = storedOrder({ status: OrderStatus.PENDING });
      prisma.order.findUnique.mockResolvedValue(current);

      await expect(
        service.updateStatus('order-1', OrderStatus.COMPLETED),
      ).rejects.toThrow(ConflictException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('ném NotFoundException nếu đơn hàng cần cập nhật không tồn tại', async () => {
      const { service, prisma } = makeService();
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', OrderStatus.PREPARING),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelOrder (Hủy đơn & Hoàn tiền)', () => {
    it('hủy ngay lập tức nếu đơn ở trạng thái PENDING', async () => {
      const { service, prisma } = makeService();
      const order = storedOrder({ status: OrderStatus.PENDING });
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancelOrder(USER, 'order-1');
      expect(result.success).toBe(true);
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('chặn hủy và ném ConflictException nếu đơn đang PREPARING hoặc READY hoặc COMPLETED', async () => {
      const { service, prisma } = makeService();
      const order = storedOrder({ status: OrderStatus.PREPARING });
      prisma.order.findFirst.mockResolvedValue(order);

      await expect(service.cancelOrder(USER, 'order-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('tạo yêu cầu hoàn tiền nếu đơn đã PAID', async () => {
      const { service, prisma } = makeService();
      const order = storedOrder({ status: OrderStatus.PAID });
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.refundRequest = {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'ref-1', status: 'PENDING' }),
      };
      prisma.order.findUnique.mockResolvedValue(order);

      const result = await service.cancelOrder(USER, 'order-1', 'Lý do đổi ý');
      expect(result.success).toBe(true);
      expect(result.isRefundPending).toBe(true);
      expect(prisma.refundRequest.upsert).toHaveBeenCalled();
    });
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
