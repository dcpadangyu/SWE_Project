import { Prisma, TransactionType } from '@prisma/client';

export function calculateLoyaltyPoints(amount: number): number {
  return Math.floor(Math.max(0, amount) / 10000);
}

// Dùng transaction của caller để điểm và thanh toán cùng commit/rollback.
export async function addLoyaltyPointsInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  orderAmount: number,
  orderId?: string,
  customPoints?: number,
) {
  const points = customPoints ?? calculateLoyaltyPoints(orderAmount);
  if (points <= 0) {
    return { userId, pointsAdded: 0, loyaltyPoints: 0, transaction: null };
  }
  const user = await tx.user.update({
    where: { id: userId },
    data: { loyaltyPoints: { increment: points } },
  });
  const transaction = await tx.loyaltyTransaction.create({
    data: { userId, orderId: orderId ?? null, points, type: TransactionType.EARN },
  });
  return { userId: user.id, pointsAdded: points, loyaltyPoints: user.loyaltyPoints, transaction };
}
