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
    product: {
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve(mockProduct()),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    order: {
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockOrder(),
          status: data.status,
        }),
      ),
    },
    payment: {
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
