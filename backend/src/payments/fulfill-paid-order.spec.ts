import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { fulfillPaidOrderInTransaction } from './fulfill-paid-order';

describe('Hoàn tất thanh toán dùng chung Mock/VNPay', () => {
  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      product: {
        findUnique: jest.fn().mockResolvedValue({ stock: 10, version: 3, isAvailable: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      voucher: {
        findUnique: jest.fn().mockResolvedValue({ id: 'voucher-1', usageLimit: 10, usedCount: 9 }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { update: jest.fn().mockResolvedValue({ id: 'user-1', loyaltyPoints: 5 }) },
      loyaltyTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    const order = { id: 'order-1', userId: 'user-1', voucherCode: 'BREW10' as string | null,
      items: [{ productId: 'b', quantity: 1 }, { productId: 'a', quantity: 2 }, { productId: 'b', quantity: 3 }] };
    return { tx, order, fulfill: (amount = 58000) =>
      fulfillPaidOrderInTransaction(tx as unknown as Prisma.TransactionClient, order, new Prisma.Decimal(amount)) };
  }

  it('gom dòng cùng sản phẩm, khóa theo thứ tự, dùng voucher một lần và tính điểm trên tiền đã trả', async () => {
    const { tx, fulfill } = setup();
    expect(await fulfill()).toEqual({ ok: true });
    expect(tx.product.findUnique.mock.calls.map(([args]) => args.where.id)).toEqual(['a', 'b']);
    expect(tx.product.updateMany.mock.calls.map(([args]) => [args.where.id, args.data.stock.decrement]))
      .toEqual([['a', 2], ['b', 4]]);
    expect(tx.voucher.update).toHaveBeenCalledTimes(1);
    expect(tx.voucher.update).toHaveBeenCalledWith({ where: { id: 'voucher-1' }, data: { usedCount: { increment: 1 } } });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { loyaltyPoints: { increment: 5 } } });
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', orderId: 'order-1', points: 5, type: 'EARN' },
    });
  });

  it('món sau hết kho: không trừ kho món trước, không dùng voucher hoặc cộng điểm', async () => {
    const { tx, fulfill } = setup();
    tx.product.findUnique.mockResolvedValueOnce({ stock: 10, version: 3, isAvailable: true })
      .mockResolvedValueOnce({ stock: 0, version: 3, isAvailable: true });
    expect(await fulfill()).toMatchObject({ ok: false, code: 'OUT_OF_STOCK' });
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.voucher.update).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it.each([null, { id: 'voucher-1', usageLimit: 10, usedCount: 10 }])(
    'voucher thiếu/hết lượt: từ chối trước mọi thay đổi', async voucher => {
      const { tx, fulfill } = setup();
      tx.voucher.findUnique.mockResolvedValue(voucher);
      expect(await fulfill()).toMatchObject({ ok: false, code: 'VOUCHER_UNAVAILABLE' });
      expect(tx.product.updateMany).not.toHaveBeenCalled();
      expect(tx.voucher.update).not.toHaveBeenCalled();
      expect(tx.user.update).not.toHaveBeenCalled();
    },
  );

  it('voucher không giới hạn vẫn tăng lượt dùng', async () => {
    const { tx, fulfill } = setup();
    tx.voucher.findUnique.mockResolvedValue({ id: 'voucher-1', usageLimit: null, usedCount: 100 });
    expect(await fulfill()).toEqual({ ok: true });
    expect(tx.voucher.update).toHaveBeenCalledTimes(1);
  });

  it('không có voucher, tiền dưới 10.000: không ghi voucher/điểm', async () => {
    const { tx, order, fulfill } = setup();
    order.voucherCode = null;
    expect(await fulfill(9999)).toEqual({ ok: true });
    expect(tx.voucher.findUnique).not.toHaveBeenCalled();
    expect(tx.voucher.update).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  it('xung đột sau khi bắt đầu ghi phải ném lỗi để caller rollback, không trả kết quả cần hoàn tiền', async () => {
    const { tx, fulfill } = setup();
    tx.product.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(fulfill()).rejects.toThrow(ConflictException);
    expect(tx.voucher.update).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('lỗi ghi lịch sử điểm phải truyền ra transaction, không được nuốt lỗi', async () => {
    const { tx, fulfill } = setup();
    tx.loyaltyTransaction.create.mockRejectedValue(new Error('loyalty write failed'));
    await expect(fulfill()).rejects.toThrow('loyalty write failed');
  });
});
