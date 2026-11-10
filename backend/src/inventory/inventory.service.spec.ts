import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Size } from '@prisma/client';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      ingredient: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      ingredientAuditLog: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      recipeItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return cb;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('calculateProductStock (Bottleneck Formula)', () => {
    it('tính toán số ly tối đa theo nguyên liệu có sẵn ít nhất (bottleneck)', async () => {
      // Giả lập sản phẩm cần: 20g cà phê và 40ml sữa
      prisma.recipeItem.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          productId: 'prod-1',
          size: Size.M,
          amount: 20,
          ingredient: {
            id: 'ing-coffee',
            name: 'Cà phê',
            stock: 100, // Đủ 100/20 = 5 ly
          },
        },
        {
          id: 'rec-2',
          productId: 'prod-1',
          size: Size.M,
          amount: 40,
          ingredient: {
            id: 'ing-milk',
            name: 'Sữa đặc',
            stock: 80, // Đủ 80/40 = 2 ly (Bottleneck)
          },
        },
      ]);

      prisma.product.update.mockResolvedValue({
        id: 'prod-1',
        stock: 2,
        isAvailable: true,
      });

      const maxCups = await service.calculateProductStock('prod-1');

      expect(maxCups).toBe(2);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          stock: 2,
          isAvailable: true,
        },
      });
    });

    it('trả về 0 và chuyển isAvailable = false nếu một nguyên liệu bị hết', async () => {
      prisma.recipeItem.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          productId: 'prod-1',
          size: Size.M,
          amount: 20,
          ingredient: {
            id: 'ing-coffee',
            name: 'Cà phê',
            stock: 100,
          },
        },
        {
          id: 'rec-2',
          productId: 'prod-1',
          size: Size.M,
          amount: 40,
          ingredient: {
            id: 'ing-milk',
            name: 'Sữa đặc',
            stock: 10, // Thiếu vì cần 40 (chỉ làm được 0 ly)
          },
        },
      ]);

      prisma.product.update.mockResolvedValue({
        id: 'prod-1',
        stock: 0,
        isAvailable: false,
      });

      const maxCups = await service.calculateProductStock('prod-1');

      expect(maxCups).toBe(0);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          stock: 0,
          isAvailable: false,
        },
      });
    });
  });

  describe('updateIngredientStock', () => {
    it('cộng thêm tồn kho và tự động kích hoạt tính lại stock sản phẩm', async () => {
      prisma.ingredient.findUnique.mockResolvedValue({
        id: 'ing-coffee',
        name: 'Cà phê',
        stock: 500,
      });

      prisma.ingredient.update.mockResolvedValue({
        id: 'ing-coffee',
        name: 'Cà phê',
        stock: 1500,
      });

      // Giả lập recalculateAllProductsStock
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      prisma.recipeItem.findMany.mockResolvedValue([]);
      prisma.product.update.mockResolvedValue({});

      const result = await service.updateIngredientStock('ing-coffee', 1000, 'ADD');

      expect(prisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-coffee' },
        data: { stock: { increment: 1000 } },
      });
      expect(result.stock).toBe(1500);
    });

    it('ném lỗi NotFoundException nếu nguyên liệu không tồn tại', async () => {
      prisma.ingredient.findUnique.mockResolvedValue(null);

      await expect(
        service.updateIngredientStock('non-existent', 500, 'ADD'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deductIngredientsForOrder', () => {
    it('trừ tồn kho nguyên liệu đúng theo số lượng và công thức từng món', async () => {
      const order = {
        id: 'order-1',
        items: [
          {
            productId: 'prod-1',
            size: Size.M,
            quantity: 2,
          },
        ],
      };

      prisma.order.findUnique.mockResolvedValue(order);
      prisma.recipeItem.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          ingredientId: 'ing-coffee',
          size: Size.M,
          amount: 25,
        },
        {
          productId: 'prod-1',
          ingredientId: 'ing-milk',
          size: Size.M,
          amount: 40,
        },
      ]);

      await service.deductIngredientsForOrder(prisma, 'order-1');

      // 2 ly * 25g cà phê = 50g
      expect(prisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-coffee' },
        data: { stock: { decrement: 50 } },
      });

      // 2 ly * 40ml sữa = 80ml
      expect(prisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-milk' },
        data: { stock: { decrement: 80 } },
      });
    });
  });

  describe('createIngredient & Audit Log', () => {
    it('thêm nguyên liệu mới và ghi nhận audit log CREATE', async () => {
      prisma.ingredient.findFirst.mockResolvedValue(null);
      prisma.ingredient.create.mockResolvedValue({
        id: 'ing-new',
        name: 'Trà Oolong',
        unit: 'g',
        stock: 3000,
        minThreshold: 200,
      });

      const result = await service.createIngredient(
        {
          name: 'Trà Oolong',
          unit: 'g',
          stock: 3000,
          minThreshold: 200,
        },
        'Staff Test',
      );

      expect(result.id).toBe('ing-new');
      expect(prisma.ingredient.create).toHaveBeenCalled();
      expect(prisma.ingredientAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            ingredientName: 'Trà Oolong',
            performedBy: 'Staff Test',
          }),
        }),
      );
    });
  });

  describe('deleteIngredient & Audit Log', () => {
    it('xóa nguyên liệu và ghi nhận audit log DELETE', async () => {
      prisma.ingredient.findUnique.mockResolvedValue({
        id: 'ing-del',
        name: 'Syrup Dâu',
        unit: 'ml',
        stock: 500,
      });
      prisma.ingredient.delete.mockResolvedValue({});
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.deleteIngredient('ing-del', 'Staff Delete');

      expect(result.success).toBe(true);
      expect(prisma.ingredient.delete).toHaveBeenCalledWith({ where: { id: 'ing-del' } });
      expect(prisma.ingredientAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DELETE',
            ingredientName: 'Syrup Dâu',
            performedBy: 'Staff Delete',
          }),
        }),
      );
    });
  });
});
