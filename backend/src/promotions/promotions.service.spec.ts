/**
 * ============================================================================
 * UNIT TEST: PROMOTIONS SERVICE (KIỂM THỬ NGHIỆP VỤ KHUYẾN MÃI & TÍCH ĐIỂM)
 * ============================================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PromotionsService', () => {
  let service: PromotionsService;

  const mockPrismaService: any = {
    voucher: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loyaltyTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  const baseValidVoucher = {
    id: 'voucher-uuid-1',
    code: 'BREW10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderValue: 50000,
    maxDiscount: 15000,
    maxUsage: 100,
    usedCount: 20,
    validFrom: new Date(Date.now() - 86400000), // Hôm qua
    validUntil: new Date(Date.now() + 86400000), // Ngày mai
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation((callback: any) =>
      callback(mockPrismaService),
    );
  });

  describe('applyVoucher', () => {
    it('1. Áp mã thành công theo phần trăm (PERCENTAGE) và trả về đúng discountAmount, finalAmount', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(baseValidVoucher);

      const result = await service.applyVoucher({
        code: 'brew10',
        orderValue: 100000,
      });

      expect(mockPrismaService.voucher.findUnique).toHaveBeenCalledWith({
        where: { code: 'BREW10' },
      });
      expect(result).toEqual({
        code: 'BREW10',
        discountType: 'PERCENTAGE',
        discountAmount: 10000,
        finalAmount: 90000,
      });
    });

    it('2. Áp mã thành công theo số tiền cố định (FIXED_AMOUNT)', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...baseValidVoucher,
        code: 'GIAM20K',
        discountType: 'FIXED_AMOUNT',
        discountValue: 20000,
      });

      const result = await service.applyVoucher({
        code: 'GIAM20K',
        orderValue: 65000,
      });

      expect(result).toEqual({
        code: 'GIAM20K',
        discountType: 'FIXED_AMOUNT',
        discountAmount: 20000,
        finalAmount: 45000,
      });
    });

    it('3. Báo lỗi BadRequestException khi mã giảm giá đã hết hạn (validUntil < now)', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...baseValidVoucher,
        validUntil: new Date(Date.now() - 3600000), // Đã hết hạn 1 giờ trước
      });

      await expect(
        service.applyVoucher({ code: 'BREW10', orderValue: 100000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. Báo lỗi BadRequestException khi mã giảm giá đã hết lượt dùng (usedCount >= maxUsage)', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...baseValidVoucher,
        maxUsage: 50,
        usedCount: 50,
      });

      await expect(
        service.applyVoucher({ code: 'BREW10', orderValue: 100000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. Báo lỗi BadRequestException khi đơn hàng chưa đạt giá trị tối thiểu (orderValue < minOrderValue)', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue({
        ...baseValidVoucher,
        minOrderValue: 50000,
      });

      await expect(
        service.applyVoucher({ code: 'BREW10', orderValue: 35000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. Báo lỗi NotFoundException khi mã giảm giá không tồn tại', async () => {
      mockPrismaService.voucher.findUnique.mockResolvedValue(null);

      await expect(
        service.applyVoucher({ code: 'INVALID_CODE', orderValue: 100000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addLoyaltyPoints', () => {
    it('Cộng điểm vào User.loyaltyPoints và ghi nhận lịch sử vào bảng LoyaltyTransaction', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        loyaltyPoints: 16,
      });
      mockPrismaService.loyaltyTransaction.create.mockResolvedValue({
        id: 'tx-1',
        userId: 'user-1',
        orderId: 'order-1',
        points: 6,
        type: 'EARN',
      });

      const result = await service.addLoyaltyPoints('user-1', 65000, 'order-1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loyaltyPoints: { increment: 6 } },
      });
      expect(mockPrismaService.loyaltyTransaction.create).toHaveBeenCalled();
      expect(result.pointsAdded).toBe(6);
      expect(result.loyaltyPoints).toBe(16);
    });
  });

  describe('getAvailableVouchers', () => {
    it('Lấy danh sách voucher còn hiệu lực và loại bỏ voucher đã hết lượt dùng', async () => {
      const activeVouchers = [
        {
          id: 'v-1',
          code: 'SALE10',
          isActive: true,
          endDate: new Date(Date.now() + 86400000),
          usageLimit: 10,
          usedCount: 2,
        },
        {
          id: 'v-2',
          code: 'UNLIMITED',
          isActive: true,
          endDate: null,
          usageLimit: null,
          usedCount: 50,
        },
        {
          id: 'v-3',
          code: 'EXHAUSTED',
          isActive: true,
          endDate: new Date(Date.now() + 86400000),
          usageLimit: 5,
          usedCount: 5, // Đã hết lượt dùng
        },
      ];

      mockPrismaService.voucher.findMany.mockResolvedValue(activeVouchers);

      const result = await service.getAvailableVouchers();

      expect(mockPrismaService.voucher.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result.map((v: any) => v.code)).toEqual(['SALE10', 'UNLIMITED']);
    });
  });

  describe('redeemPoints', () => {
    it('Đổi điểm thành công: trừ điểm, tạo LoyaltyTransaction REDEEM, tạo Voucher và trả về kết quả', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        loyaltyPoints: 30,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        loyaltyPoints: 20,
      });
      mockPrismaService.loyaltyTransaction.create.mockResolvedValue({
        id: 'tx-redeem-1',
        userId: 'user-1',
        points: 10,
        type: 'REDEEM',
      });
      mockPrismaService.voucher.create.mockResolvedValue({
        id: 'voucher-created-1',
      });

      const result = await service.redeemPoints('user-1', 'REWARD10K');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { loyaltyPoints: { decrement: 10 } },
      });
      expect(mockPrismaService.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          points: 10,
          type: 'REDEEM',
        },
      });
      expect(mockPrismaService.voucher.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountType: 'FIXED_AMOUNT',
            discountValue: 10000,
            minOrderValue: 20000,
            usageLimit: 1,
            usedCount: 0,
            isActive: true,
          }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Đổi điểm thành công!');
      expect(result.discountValue).toBe(10000);
      expect(result.remainingPoints).toBe(20);
      expect(result.code).toMatch(/^LP10K-/);
    });

    it('Báo lỗi BadRequestException khi số điểm của user không đủ', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        loyaltyPoints: 5, // Cần 10 điểm cho REWARD10K
      });

      await expect(
        service.redeemPoints('user-1', 'REWARD10K'),
      ).rejects.toThrow(
        new BadRequestException('Bạn cần tối thiểu 10 điểm để đổi mã này.'),
      );
    });

    it('Báo lỗi BadRequestException khi gói đổi điểm không hợp lệ', async () => {
      await expect(
        service.redeemPoints('user-1', 'INVALID_REWARD'),
      ).rejects.toThrow(new BadRequestException('Gói đổi điểm không hợp lệ.'));
    });

    it('Báo lỗi NotFoundException khi không tìm thấy người dùng', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.redeemPoints('non-existent-user', 'REWARD10K'),
      ).rejects.toThrow(new NotFoundException('Người dùng không tồn tại.'));
    });
  });
});
