import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PaymentsService } from './payments.service';

const D = (v: number) => new Prisma.Decimal(v);

const USER_ID = 'u0000000-0000-4000-8000-000000000001';
const OTHER_USER = 'u0000000-0000-4000-8000-000000000002';
const ORDER_ID = 'o0000000-0000-4000-8000-000000000001';
const PRODUCT_ID = 'p0000000-0000-4000-8000-000000000001';

function mockProduct(over: Record<string, unknown> = {}) {
  return {
    id: PRODUCT_ID,
    name: 'Cà phê Muối',
    stock: 5,
    version: 0,
    isAvailable: true,
    ...over,
  };
}

function mockOrder(over: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    orderNumber: 1042,
    userId: USER_ID,
    status: OrderStatus.PENDING,
    createdAt: new Date(),
    totalAmount: D(58000),
    items: [
      {
        id: 'item-1',
        orderId: ORDER_ID,
        productId: PRODUCT_ID,
        quantity: 2,
      },
    ],
    ...over,
  };
}

function setupMockService() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: { update: jest.fn().mockResolvedValue({ id: USER_ID, loyaltyPoints: 5 }) },
    loyaltyTransaction: { create: jest.fn().mockResolvedValue({}) },
    voucher: { findUnique: jest.fn(), update: jest.fn() },
    product: {
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve(mockProduct()),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    order: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockOrder()),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockOrder(),
          status: data.status,
        }),
      ),
    },
    payment: {
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'pay-001',
          ...data,
          completedAt: new Date(),
        }),
      ),
    },
  };

  const prisma = {
    payment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    order: {
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve(mockOrder()),
      ),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockOrder(),
          status: data.status,
        }),
      ),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => {
      return cb(tx);
    }),
  };

  const service = new PaymentsService(prisma as never);
  return { service, prisma, tx };
}

describe('PaymentsService (Task 8 + Task 10.2 & 10.3)', () => {
  const validKey = 'idem-key-12345';
  const validDto = {
    orderId: ORDER_ID,
    paymentMethod: PaymentMethod.E_WALLET,
  };

  describe('Thanh toán thành công (Happy Path & Optimistic Locking)', () => {
    it('không cho mô phỏng thất bại để đổi trạng thái đơn có giao dịch VNPay', async () => {
      const { service, prisma, tx } = setupMockService();
      prisma.payment.findFirst.mockResolvedValue({ id: 'pending-vnpay' });
      await expect(service.processPayment(USER_ID, validKey, { ...validDto, simulateFailure: true })).rejects.toThrow('VNPay');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    });
    it('chặn Mock nếu đơn vẫn có giao dịch VNPay cần đối soát', async () => {
      const { service, tx } = setupMockService();
      tx.payment.findFirst.mockResolvedValue({ id: 'pending-vnpay' });
      await expect(service.processPayment(USER_ID, validKey, validDto)).rejects.toThrow('VNPay');
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('Mock hủy đơn quá 10 phút, không trừ kho hay tạo payment thành công', async () => {
      const { service, tx } = setupMockService();
      tx.order.findUniqueOrThrow.mockResolvedValue(mockOrder({ createdAt: new Date(Date.now() - 11 * 60000) }));
      await expect(service.processPayment(USER_ID, validKey, validDto)).rejects.toThrow('quá hạn');
      expect(tx.order.update).toHaveBeenCalledWith({ where: { id: ORDER_ID }, data: { status: OrderStatus.CANCELLED } });
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('Mock tăng lượt dùng voucher và cộng điểm ngay trong transaction thanh toán', async () => {
      const { service, prisma, tx } = setupMockService();
      tx.order.findUniqueOrThrow.mockResolvedValue(mockOrder({ voucherCode: 'BREW10' }));
      tx.voucher.findUnique.mockResolvedValue({ id: 'voucher-1', usageLimit: 10, usedCount: 9 });

      await service.processPayment(USER_ID, validKey, validDto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.voucher.update).toHaveBeenCalledWith({ where: { id: 'voucher-1' }, data: { usedCount: { increment: 1 } } });
      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: USER_ID }, data: { loyaltyPoints: { increment: 5 } } });
      expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, orderId: ORDER_ID, points: 5, type: 'EARN' },
      });
    });

    it('lỗi cộng điểm làm transaction thất bại, không trả thanh toán thành công', async () => {
      const { service, tx } = setupMockService();
      tx.loyaltyTransaction.create.mockRejectedValue(new Error('loyalty write failed'));
      await expect(service.processPayment(USER_ID, validKey, validDto)).rejects.toThrow('loyalty write failed');
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('đọc lại dưới khóa thấy đơn đã PAID: không trừ kho/cộng điểm lần nữa', async () => {
      const { service, tx } = setupMockService();
      tx.order.findUniqueOrThrow.mockResolvedValue(mockOrder({ status: OrderStatus.PAID }));
      await expect(service.processPayment(USER_ID, validKey, validDto)).rejects.toThrow(ConflictException);
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('thanh toán thành công đơn PENDING, trừ kho với version và đổi trạng thái sang PAID', async () => {
      const { service, tx } = setupMockService();

      const result = await service.processPayment(USER_ID, validKey, validDto);

      expect(result.replayed).toBe(false);
      expect(result.orderId).toBe(ORDER_ID);
      expect(result.status).toBe(OrderStatus.PAID);
      expect(result.totalAmount).toBe('58000.00');
      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.payment.method).toBe(PaymentMethod.E_WALLET);
      expect(result.payment.transactionCode).toMatch(/^PAY-[A-Z0-9]{8}$/);

      // Kiểm tra Optimistic Locking: updateMany có điều kiện version và stock >= 2
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: PRODUCT_ID,
          version: 0,
          stock: { gte: 2 },
        },
        data: {
          stock: { decrement: 2 },
          version: { increment: 1 },
        },
      });

      // Kiểm tra trạng thái đơn được cập nhật sang PAID
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: OrderStatus.PAID },
      });

      // Kiểm tra bản ghi thanh toán được tạo
      expect(tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: ORDER_ID,
          attemptNumber: 1,
          idempotencyKey: validKey,
          status: PaymentStatus.SUCCESS,
        }),
      });
    });

    it('cho phép thanh toán lại thành công sau khi lần thử trước bị PAYMENT_FAILED', async () => {
      const { service, prisma, tx } = setupMockService();
      prisma.order.findUnique.mockResolvedValue(
        mockOrder({ status: OrderStatus.PAYMENT_FAILED }),
      );
      prisma.payment.count.mockResolvedValue(1); // Lần thử thứ 2

      const result = await service.processPayment(
        USER_ID,
        'new-key-attempt-2',
        validDto,
      );

      expect(result.status).toBe(OrderStatus.PAID);
      expect(tx.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attemptNumber: 2,
            idempotencyKey: 'new-key-attempt-2',
          }),
        }),
      );
    });
  });

  describe('Task 10.2 - Chống thanh toán trùng lặp (Idempotency)', () => {
    it('phát lại kết quả (replayed: true) và không gọi transaction trừ kho nếu Idempotency-Key đã thành công trước đó', async () => {
      const { service, prisma, tx } = setupMockService();
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-existing-1',
        orderId: ORDER_ID,
        idempotencyKey: validKey,
        paymentMethod: PaymentMethod.E_WALLET,
        status: PaymentStatus.SUCCESS,
        amount: D(58000),
        transactionCode: 'PAY-CACHED99',
        completedAt: new Date('2026-11-01T20:00:00Z'),
        order: {
          orderNumber: 1042,
          status: OrderStatus.PAID,
        },
      });

      const result = await service.processPayment(USER_ID, validKey, validDto);

      expect(result.replayed).toBe(true);
      expect(result.orderId).toBe(ORDER_ID);
      expect(result.status).toBe(OrderStatus.PAID);
      expect(result.payment.transactionCode).toBe('PAY-CACHED99');

      // Đảm bảo không truy vấn lại order hay mở transaction trừ kho lần 2
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.product.updateMany).not.toHaveBeenCalled();
    });

    it('ném lại lỗi 402 cũ nếu Idempotency-Key ứng với giao dịch đã thất bại trước đó', async () => {
      const { service, prisma } = setupMockService();
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-failed-1',
        orderId: ORDER_ID,
        idempotencyKey: validKey,
        status: PaymentStatus.FAILED,
        amount: D(58000),
        errorMessage: 'Thẻ không đủ số dư',
        attemptNumber: 1,
        order: { orderNumber: 1042, status: OrderStatus.PAYMENT_FAILED },
      });

      try {
        await service.processPayment(USER_ID, validKey, validDto);
        fail('Phải ném HttpException 402');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        const res = (err as HttpException).getResponse() as Record<string, unknown>;
        expect(res.statusCode).toBe(HttpStatus.PAYMENT_REQUIRED);
        expect(res.replayed).toBe(true);
        expect(res.message).toBe('Thẻ không đủ số dư');
      }

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('ném ConflictException nếu Idempotency-Key được dùng cho đơn hàng khác', async () => {
      const { service, prisma } = setupMockService();
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-diff-order',
        orderId: 'other-order-id',
        idempotencyKey: validKey,
        order: { orderNumber: 999, status: OrderStatus.PAID },
      });

      await expect(
        service.processPayment(USER_ID, validKey, validDto),
      ).rejects.toThrow(ConflictException);
    });

    it('ném BadRequestException nếu Idempotency-Key bị trống hoặc quá dài', async () => {
      const { service } = setupMockService();

      await expect(
        service.processPayment(USER_ID, '', validDto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.processPayment(USER_ID, '   ', validDto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.processPayment(USER_ID, 'a'.repeat(129), validDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Task 10.3 - Trừ tồn kho đồng thời (Optimistic Locking Concurrency)', () => {
    it('ném CONCURRENCY_CONFLICT nếu version bị thay đổi bởi giao dịch khác (count = 0)', async () => {
      const { service, tx } = setupMockService();
      // Giả lập va chạm đồng thời: updateMany không khớp version => count = 0
      tx.product.updateMany.mockResolvedValue({ count: 0 });

      try {
        await service.processPayment(USER_ID, validKey, validDto);
        fail('Phải ném ConflictException khi có xung đột đồng thời');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const res = (err as ConflictException).getResponse() as Record<string, unknown>;
        expect(res.code).toBe('CONCURRENCY_CONFLICT');
      }

      // Đơn hàng không bị chuyển thành PAID
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('ném OUT_OF_STOCK nếu số lượng tồn kho không đủ', async () => {
      const { service, tx } = setupMockService();
      // Tồn kho chỉ còn 1 nhưng đơn hàng yêu cầu 2
      tx.product.findUnique.mockResolvedValue(mockProduct({ stock: 1 }));

      try {
        await service.processPayment(USER_ID, validKey, validDto);
        fail('Phải ném ConflictException OUT_OF_STOCK');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const res = (err as ConflictException).getResponse() as Record<string, unknown>;
        expect(res.code).toBe('OUT_OF_STOCK');
      }

      expect(tx.product.updateMany).not.toHaveBeenCalled();
    });

    it('ném OUT_OF_STOCK nếu sản phẩm đã bị đánh dấu ngừng phục vụ (isAvailable = false)', async () => {
      const { service, tx } = setupMockService();
      tx.product.findUnique.mockResolvedValue(mockProduct({ isAvailable: false }));

      await expect(
        service.processPayment(USER_ID, validKey, validDto),
      ).rejects.toThrow(ConflictException);
    });

    it('Task 10(c) Concurrency Test: 2 khách đồng thời thanh toán mua món cuối cùng (stock = 1, version = 1): đúng 1 người thành công và 1 người nhận CONCURRENCY_CONFLICT, tồn kho không bao giờ âm', async () => {
      let currentStock = 1;
      let currentVersion = 1;

      const order1Id = 'order-client-1';
      const order2Id = 'order-client-2';
      const user1Id = 'user-1';
      const user2Id = 'user-2';

      const sharedPrisma = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
        },
        order: {
          findUnique: jest.fn((args: { where: { id: string } }) => {
            const isO1 = args.where.id === order1Id;
            return Promise.resolve(mockOrder({
              id: isO1 ? order1Id : order2Id,
              userId: isO1 ? user1Id : user2Id,
              status: OrderStatus.PENDING,
              items: [{ productId: PRODUCT_ID, quantity: 1 }],
            }));
          }),
        },
        $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
          const tx = {
            $queryRaw: jest.fn().mockResolvedValue([]),
            order: {
              findUniqueOrThrow: jest.fn((args: { where: { id: string } }) => {
                const isO1 = args.where.id === order1Id;
                return Promise.resolve(mockOrder({
                  id: isO1 ? order1Id : order2Id,
                  userId: isO1 ? user1Id : user2Id,
                  status: OrderStatus.PENDING,
                  items: [{ productId: PRODUCT_ID, quantity: 1 }],
                }));
              }),
              update: jest.fn().mockImplementation(({ where, data }: { where: { id: string }; data: { status: OrderStatus } }) =>
                Promise.resolve(mockOrder({ id: where.id, status: data.status })),
              ),
            },
            payment: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
                Promise.resolve({
                  id: 'pay-001',
                  ...data,
                  completedAt: new Date(),
                }),
              ),
            },
            product: {
              findUnique: jest.fn().mockImplementation(() =>
                Promise.resolve(mockProduct({ id: PRODUCT_ID, stock: currentStock, version: currentVersion })),
              ),
              updateMany: jest.fn().mockImplementation(({ where }: { where: { version: number; stock: { gte: number } } }) => {
                if (where.version === currentVersion && currentStock >= where.stock.gte) {
                  currentStock -= 1;
                  currentVersion += 1;
                  return Promise.resolve({ count: 1 });
                }
                return Promise.resolve({ count: 0 });
              }),
            },
            user: {
              update: jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
                Promise.resolve({ id: where.id, loyaltyPoints: 10 }),
              ),
            },
            loyaltyTransaction: { create: jest.fn() },
            voucher: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
          };
          return callback(tx);
        }),
      };

      const testService = new PaymentsService(sharedPrisma as never);

      const req1 = testService.processPayment(user1Id, 'key-client-1', {
        orderId: order1Id,
        paymentMethod: PaymentMethod.E_WALLET,
      });
      const req2 = testService.processPayment(user2Id, 'key-client-2', {
        orderId: order2Id,
        paymentMethod: PaymentMethod.E_WALLET,
      });

      const results = await Promise.allSettled([req1, req2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectionReason).toBeInstanceOf(ConflictException);
      expect((rejectionReason as ConflictException).getResponse()).toMatchObject({
        code: 'CONCURRENCY_CONFLICT',
      });

      expect(currentStock).toBe(0);
      expect(currentVersion).toBe(2);
    });
  });

  describe('Xử lý Thất bại và Giới hạn 3 lần thử (AC-13.3)', () => {
    it('lần thất bại thứ 1 và 2: chuyển trạng thái sang PAYMENT_FAILED, không trừ kho, ném 402', async () => {
      const { service, prisma, tx } = setupMockService();
      prisma.payment.count.mockResolvedValue(0); // Lần thử 1

      try {
        await service.processPayment(USER_ID, validKey, {
          ...validDto,
          simulateFailure: true,
        });
        fail('Phải ném HttpException 402');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        const res = (err as HttpException).getResponse() as Record<string, unknown>;
        expect(res.statusCode).toBe(HttpStatus.PAYMENT_REQUIRED);
        expect(res.code).toBe('PAYMENT_FAILED');
        expect(res.attemptNumber).toBe(1);
      }

      // Không bao giờ gọi trừ kho
      expect(tx.product.updateMany).not.toHaveBeenCalled();

      // Đơn chuyển sang PAYMENT_FAILED
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: OrderStatus.PAYMENT_FAILED },
      });

      // Tạo bản ghi Payment FAILED
      expect(tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: PaymentStatus.FAILED,
          errorCode: 'GATEWAY_DECLINED',
        }),
      });
    });

    it('lần thất bại thứ 3: tự động hủy đơn (chuyển CANCELLED) và ghi nhận FAILED', async () => {
      const { service, prisma, tx } = setupMockService();
      prisma.payment.count.mockResolvedValue(2); // Đã thất bại 2 lần, đây là lần thứ 3

      try {
        await service.processPayment(USER_ID, validKey, {
          ...validDto,
          simulateFailure: true,
        });
        fail('Phải ném HttpException 402');
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        const res = (err as HttpException).getResponse() as Record<string, unknown>;
        expect(res.statusCode).toBe(HttpStatus.PAYMENT_REQUIRED);
        expect(res.attemptNumber).toBe(3);
      }

      // Đơn hàng chuyển sang CANCELLED vì đã đạt tối đa 3 lần thất bại
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    it('thử lần thứ 4: ném ConflictException và hủy đơn', async () => {
      const { service, prisma } = setupMockService();
      prisma.payment.count.mockResolvedValue(3); // Đã có 3 lần thử

      await expect(
        service.processPayment(USER_ID, validKey, validDto),
      ).rejects.toThrow(ConflictException);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  });

  describe('Kiểm tra Quyền & Ràng buộc Đơn hàng', () => {
    it('ném NotFoundException nếu đơn hàng không tồn tại', async () => {
      const { service, prisma } = setupMockService();
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.processPayment(USER_ID, validKey, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném ForbiddenException nếu thanh toán đơn hàng của người khác', async () => {
      const { service, prisma } = setupMockService();
      prisma.order.findUnique.mockResolvedValue(
        mockOrder({ userId: OTHER_USER }),
      );

      await expect(
        service.processPayment(USER_ID, validKey, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ném ConflictException nếu đơn hàng đã ở trạng thái PAID hoặc COMPLETED', async () => {
      const { service, prisma } = setupMockService();
      prisma.order.findUnique.mockResolvedValue(
        mockOrder({ status: OrderStatus.PAID }),
      );

      await expect(
        service.processPayment(USER_ID, validKey, validDto),
      ).rejects.toThrow(ConflictException);
    });

    it('ném ConflictException nếu đơn hàng đã bị CANCELLED', async () => {
      const { service, prisma } = setupMockService();
      prisma.order.findUnique.mockResolvedValue(
        mockOrder({ status: OrderStatus.CANCELLED }),
      );

      await expect(
        service.processPayment(USER_ID, validKey, validDto),
      ).rejects.toThrow(ConflictException);
    });
  });
});
