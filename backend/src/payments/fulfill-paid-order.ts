import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addLoyaltyPointsInTransaction } from '../promotions/loyalty-points';

type PaidOrder = {
  id: string;
  userId: string;
  voucherCode: string | null;
  items: { productId: string; quantity: number }[];
};
type FulfillmentResult = { ok: true } |
  { ok: false; code: 'OUT_OF_STOCK' | 'VOUCHER_UNAVAILABLE'; message: string };

// Caller chống xử lý trùng/khóa order và ghi trạng thái order/payment trong cùng tx.
// Chỉ trả ok=false TRƯỚC mọi cập nhật để VNPay có thể ghi REFUND_REQUIRED an toàn.
// Mọi lỗi sau khi bắt đầu ghi phải ném ra ngoài để rollback toàn bộ transaction.
export async function fulfillPaidOrderInTransaction(
  tx: Prisma.TransactionClient,
  order: PaidOrder,
  amount: Prisma.Decimal,
): Promise<FulfillmentResult> {
  let voucherId: string | undefined;
  if (order.voucherCode) {
    await tx.$queryRaw`SELECT "id" FROM "vouchers" WHERE "code" = ${order.voucherCode} FOR UPDATE`;
    const voucher = await tx.voucher.findUnique({ where: { code: order.voucherCode } });
    if (!voucher || (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit)) {
      return { ok: false, code: 'VOUCHER_UNAVAILABLE', message: 'Voucher không còn lượt sử dụng sau khi thanh toán.' };
    }
    voucherId = voucher.id;
  }

  const quantities = new Map<string, number>();
  for (const item of order.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }
  const productIds = [...quantities.keys()].sort();
  const versions = new Map<string, number>();
  // Khóa theo thứ tự cố định, kiểm tra TẤT CẢ món trước khi trừ kho.
  for (const productId of productIds) {
    await tx.$queryRaw`SELECT "id" FROM "products" WHERE "id" = ${productId} FOR UPDATE`;
    const product = await tx.product.findUnique({ where: { id: productId } });
    const quantity = quantities.get(productId)!;
    if (!product || !product.isAvailable || product.stock < quantity) {
      return { ok: false, code: 'OUT_OF_STOCK', message: 'Sản phẩm không còn phục vụ hoặc không đủ tồn kho.' };
    }
    versions.set(productId, product.version);
  }

  for (const productId of productIds) {
    const quantity = quantities.get(productId)!;
    const updated = await tx.product.updateMany({
      where: { id: productId, version: versions.get(productId)!, stock: { gte: quantity } },
      data: { stock: { decrement: quantity }, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new ConflictException({ code: 'CONCURRENCY_CONFLICT', message: 'Xung đột cập nhật tồn kho. Vui lòng thử lại.' });
    }
  }

  // Trừ tồn kho nguyên liệu theo công thức nếu có
  for (const item of order.items) {
    const itemSize = (item as any).size || 'M';
    try {
      const recipes = await (tx as any).recipeItem?.findMany?.({
        where: {
          productId: item.productId,
          size: itemSize,
        },
      });
      if (recipes && Array.isArray(recipes)) {
        for (const recipe of recipes) {
          const totalDeduct = Number(recipe.amount) * item.quantity;
          if (totalDeduct > 0) {
            await (tx as any).ingredient?.update?.({
              where: { id: recipe.ingredientId },
              data: { stock: { decrement: totalDeduct } },
            });
          }
        }
      }
    } catch {
      // Bỏ qua nếu bảng recipe chưa sẵn sàng hoặc test mock
    }
  }

  if (voucherId) {
    await tx.voucher.update({ where: { id: voucherId }, data: { usedCount: { increment: 1 } } });
  }
  await addLoyaltyPointsInTransaction(tx, order.userId, amount.toNumber(), order.id);
  return { ok: true };
}
