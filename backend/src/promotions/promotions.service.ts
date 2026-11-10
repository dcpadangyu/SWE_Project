/**
 * ============================================================================
 * PROMOTIONS SERVICE (DỊCH VỤ XỬ LÝ MÃ GIẢM GIÁ & TÍCH ĐIỂM THƯỞNG LOYALTY)
 * ============================================================================
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyVoucherDto, ApplyVoucherResult } from './dto/apply-voucher.dto';
import { DiscountType } from '../common/types/brewlite';
import { addLoyaltyPointsInTransaction } from './loyalty-points';

export const REWARD_OPTIONS: Record<
  string,
  { points: number; value: number; prefix: string }
> = {
  REWARD10K: { points: 10, value: 10000, prefix: 'LP10K' },
  REWARD20K: { points: 20, value: 20000, prefix: 'LP20K' },
  REWARD50K: { points: 50, value: 50000, prefix: 'LP50K' },
};

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra tính hợp lệ của mã giảm giá và tính toán số tiền được giảm
   * Phục vụ endpoint POST /promotions/apply
   */
  async applyVoucher(dto: ApplyVoucherDto): Promise<ApplyVoucherResult> {
    const normalizedCode = dto.code.trim().toUpperCase();
    const orderValue = Number(dto.orderValue);

    // 1. Tìm kiếm voucher trong CSDL theo mã code
    const voucher: any = await (this.prisma as any).voucher.findUnique({
      where: { code: normalizedCode },
    });

    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: `Mã giảm giá "${normalizedCode}" không tồn tại.`,
      });
    }

    // 2. Kiểm tra trạng thái kích hoạt (isActive)
    if (!voucher.isActive) {
      throw new BadRequestException({
        code: 'VOUCHER_INACTIVE',
        message: 'Mã giảm giá hiện đang tạm ngưng hoạt động.',
      });
    }

    // 3. Kiểm tra thời hạn hiệu lực (validFrom..validUntil hoặc startDate..endDate)
    const now = new Date();
    const validFromRaw = voucher.validFrom ?? voucher.startDate;
    const validUntilRaw = voucher.validUntil ?? voucher.endDate;

    if (validFromRaw && now < new Date(validFromRaw)) {
      throw new BadRequestException({
        code: 'VOUCHER_NOT_STARTED',
        message: 'Mã giảm giá chưa đến thời gian có hiệu lực.',
      });
    }

    if (validUntilRaw && now > new Date(validUntilRaw)) {
      throw new BadRequestException({
        code: 'VOUCHER_EXPIRED',
        message: 'Mã giảm giá đã hết hạn sử dụng.',
      });
    }

    // 4. Kiểm tra lượt dùng tối đa (usedCount < maxUsage hoặc usageLimit)
    const maxUsage = Number(voucher.maxUsage ?? voucher.usageLimit ?? 0);
    const usedCount = Number(voucher.usedCount ?? 0);

    if (maxUsage > 0 && usedCount >= maxUsage) {
      throw new BadRequestException({
        code: 'VOUCHER_USAGE_EXCEEDED',
        message: 'Mã giảm giá đã hết lượt sử dụng.',
      });
    }

    // 5. Kiểm tra giá trị đơn hàng tối thiểu (minOrderValue)
    const minOrderValue = Number(voucher.minOrderValue ?? 0);
    if (orderValue < minOrderValue) {
      throw new BadRequestException({
        code: 'MIN_ORDER_VALUE_NOT_MET',
        message: `Đơn hàng chưa đạt giá trị tối thiểu ${minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này.`,
      });
    }

    // 6. Tính toán số tiền giảm (PERCENTAGE hoặc FIXED_AMOUNT)
    const discountType: DiscountType = voucher.discountType ?? voucher.type;
    const discountValue = Number(voucher.discountValue ?? voucher.value ?? 0);
    let discountAmount = 0;

    if (discountType === 'PERCENTAGE') {
      discountAmount = Math.floor((orderValue * discountValue) / 100);
      // Nếu có giới hạn mức giảm tối đa (maxDiscount) thì áp trần
      if (
        voucher.maxDiscount !== undefined &&
        voucher.maxDiscount !== null &&
        Number(voucher.maxDiscount) > 0
      ) {
        discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
      }
    } else if (discountType === 'FIXED_AMOUNT') {
      discountAmount = discountValue;
    } else {
      throw new BadRequestException({
        code: 'INVALID_DISCOUNT_TYPE',
        message: 'Loại hình khuyến mãi không hợp lệ.',
      });
    }

    // Đảm bảo số tiền giảm không vượt quá tổng giá trị đơn hàng
    discountAmount = Math.min(discountAmount, orderValue);
    const finalAmount = Math.max(0, orderValue - discountAmount);

    return {
      code: voucher.code,
      discountType,
      discountAmount,
      finalAmount,
    };
  }

  /**
   * Xử lý cộng điểm thưởng Loyalty cho khách hàng khi hoàn tất thanh toán đơn hàng
   * - Cộng điểm vào User.loyaltyPoints
   * - Ghi nhận lịch sử vào bảng LoyaltyTransaction
   */
  async addLoyaltyPoints(
    userId: string,
    orderAmount: number,
    orderId?: string,
    customPoints?: number,
  ) {
    return this.prisma.$transaction(tx =>
      addLoyaltyPointsInTransaction(tx, userId, orderAmount, orderId, customPoints),
    );
  }

  /**
   * Lấy danh sách các mã giảm giá đang kích hoạt, còn hạn sử dụng và còn lượt dùng
   */
  async getAvailableVouchers() {
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.filter(
      (voucher) =>
        voucher.usageLimit === null ||
        voucher.usageLimit === undefined ||
        Number(voucher.usedCount ?? 0) < Number(voucher.usageLimit),
    );
  }

  /**
   * Đổi điểm thưởng Loyalty tích lũy lấy mã giảm giá (Voucher)
   * Phục vụ endpoint POST /promotions/redeem-points
   */
  async redeemPoints(userId: string, rewardId: string) {
    const option = REWARD_OPTIONS[rewardId];
    if (!option) {
      throw new BadRequestException('Gói đổi điểm không hợp lệ.');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Người dùng không tồn tại.');
      }

      if (user.loyaltyPoints < option.points) {
        throw new BadRequestException(
          `Bạn cần tối thiểu ${option.points} điểm để đổi mã này.`,
        );
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: { decrement: option.points },
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          userId,
          points: option.points,
          type: 'REDEEM',
        },
      });

      const code = `${option.prefix}-${Date.now().toString(36).toUpperCase()}`;

      await tx.voucher.create({
        data: {
          code,
          discountType: 'FIXED_AMOUNT',
          discountValue: option.value,
          minOrderValue: option.value * 2,
          usageLimit: 1,
          usedCount: 0,
          isActive: true,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        success: true,
        message: 'Đổi điểm thành công!',
        code,
        discountValue: option.value,
        remainingPoints: updatedUser.loyaltyPoints,
      };
    });
  }
}
