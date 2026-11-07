import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderExpirationService } from './order-expiration.service';

describe('Tác vụ tự hủy đơn quá hạn', () => {
  it('quét ngay khi khởi động, quét tiếp dù không có request, dừng khi tắt ứng dụng', async () => {
    jest.useFakeTimers();
    const prisma = { order: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new OrderExpirationService(prisma as unknown as PrismaService);
    try {
      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(15000);
      expect(prisma.order.findMany).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(30000);
      expect(prisma.order.findMany).toHaveBeenCalledTimes(2);
    } finally {
      service.onModuleDestroy();
      jest.useRealTimers();
    }
  });

  it('đọc lại sau khóa: IPN đã chuyển PAID thì không hủy theo dữ liệu quét cũ', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1', status: OrderStatus.PAID, createdAt: new Date(0) }),
        update: jest.fn(),
      },
    };
    const prisma = { $transaction: jest.fn().mockImplementation(callback => callback(tx)) };
    const service = new OrderExpirationService(prisma as unknown as PrismaService);
    expect(await service.expireOrder('order-1')).toBe(false);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
