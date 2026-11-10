import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientLogAction, Size } from '@prisma/client';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateProductWithRecipesDto } from './dto/create-product-with-recipes.dto';
import { UpdateProductRecipesDto } from './dto/update-product-recipes.dto';

export interface IngredientWithStatus {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minThreshold: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách toàn bộ nguyên liệu kèm trạng thái cảnh báo tồn kho
   */
  async getAllIngredients(): Promise<IngredientWithStatus[]> {
    const ingredients = await this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });

    return ingredients.map((ing) => {
      const stock = Number(ing.stock);
      const minThreshold = Number(ing.minThreshold);

      let status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK' = 'IN_STOCK';
      if (stock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (stock <= minThreshold) {
        status = 'LOW_STOCK';
      }

      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        stock,
        minThreshold,
        status,
      };
    });
  }

  /**
   * Thêm nguyên liệu mới vào kho (Kèm Audit Log CREATE màu xanh)
   */
  async createIngredient(dto: CreateIngredientDto, performedBy = 'Nhân viên Pha chế') {
    const normalizedName = dto.name.trim();

    const existing = await this.prisma.ingredient.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(`Nguyên liệu "${normalizedName}" đã tồn tại trong kho.`);
    }

    const initialStock = Math.max(0, Number(dto.stock) || 0);
    const minThreshold = dto.minThreshold !== undefined ? Math.max(0, Number(dto.minThreshold)) : 100;

    const created = await this.prisma.ingredient.create({
      data: {
        name: normalizedName,
        unit: dto.unit.trim(),
        stock: initialStock,
        minThreshold,
      },
    });

    // Ghi nhận Audit Log (CREATE)
    try {
      await this.prisma.ingredientAuditLog.create({
        data: {
          ingredientId: created.id,
          ingredientName: created.name,
          action: IngredientLogAction.CREATE,
          changeAmount: initialStock,
          previousStock: 0,
          newStock: initialStock,
          unit: created.unit,
          reason: 'Thêm mới nguyên liệu vào kho',
          performedBy,
        },
      });
    } catch (err) {
      this.logger.error('Lỗi khi ghi Audit Log CREATE:', err);
    }

    return {
      id: created.id,
      name: created.name,
      unit: created.unit,
      stock: Number(created.stock),
      minThreshold: Number(created.minThreshold),
      status: Number(created.stock) <= 0 ? 'OUT_OF_STOCK' : (Number(created.stock) <= minThreshold ? 'LOW_STOCK' : 'IN_STOCK'),
    };
  }

  /**
   * Chỉnh sửa thông tin nguyên liệu (Kèm Audit Log UPDATE màu vàng)
   */
  async updateIngredient(id: string, dto: UpdateIngredientDto, performedBy = 'Nhân viên Pha chế') {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu có ID "${id}".`);
    }

    if (dto.name && dto.name.trim().toLowerCase() !== ingredient.name.toLowerCase()) {
      const duplicate = await this.prisma.ingredient.findFirst({
        where: {
          name: { equals: dto.name.trim(), mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Tên nguyên liệu "${dto.name.trim()}" đã được sử dụng.`);
      }
    }

    const previousStock = Number(ingredient.stock);
    const newStock = dto.stock !== undefined ? Math.max(0, Number(dto.stock)) : previousStock;
    const stockDiff = newStock - previousStock;

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.unit ? { unit: dto.unit.trim() } : {}),
        ...(dto.stock !== undefined ? { stock: newStock } : {}),
        ...(dto.minThreshold !== undefined ? { minThreshold: Math.max(0, Number(dto.minThreshold)) } : {}),
      },
    });

    // Ghi nhận Audit Log (UPDATE)
    try {
      await this.prisma.ingredientAuditLog.create({
        data: {
          ingredientId: updated.id,
          ingredientName: updated.name,
          action: IngredientLogAction.UPDATE,
          changeAmount: stockDiff !== 0 ? stockDiff : 0,
          previousStock,
          newStock,
          unit: updated.unit,
          reason: dto.reason?.trim() || (stockDiff !== 0 ? `Cập nhật tồn kho (${previousStock} -> ${newStock})` : 'Cập nhật thông tin nguyên liệu'),
          performedBy,
        },
      });
    } catch (err) {
      this.logger.error('Lỗi khi ghi Audit Log UPDATE:', err);
    }

    if (stockDiff !== 0) {
      await this.recalculateAllProductsStock();
    }

    return {
      id: updated.id,
      name: updated.name,
      unit: updated.unit,
      stock: Number(updated.stock),
      minThreshold: Number(updated.minThreshold),
    };
  }

  /**
   * Xóa nguyên liệu khỏi kho (Kèm Audit Log DELETE màu đỏ)
   */
  async deleteIngredient(id: string, performedBy = 'Nhân viên Pha chế') {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
    });

    if (!ingredient) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu có ID "${id}".`);
    }

    const prevStock = Number(ingredient.stock);

    // Xóa nguyên liệu khỏi DB
    await this.prisma.ingredient.delete({
      where: { id },
    });

    // Ghi nhận Audit Log (DELETE) - ingredientId để null để lịch sử không bị mất
    try {
      await this.prisma.ingredientAuditLog.create({
        data: {
          ingredientId: null,
          ingredientName: ingredient.name,
          action: IngredientLogAction.DELETE,
          changeAmount: -prevStock,
          previousStock: prevStock,
          newStock: 0,
          unit: ingredient.unit,
          reason: 'Xóa nguyên liệu khỏi danh sách kho',
          performedBy,
        },
      });
    } catch (err) {
      this.logger.error('Lỗi khi ghi Audit Log DELETE:', err);
    }

    await this.recalculateAllProductsStock();

    return {
      success: true,
      message: `Đã xóa nguyên liệu "${ingredient.name}" thành công.`,
    };
  }

  /**
   * Cập nhật số lượng tồn kho nguyên liệu (Nhập thêm ADD hoặc ghi đè SET)
   */
  async updateIngredientStock(
    ingredientId: string,
    quantity: number,
    action: 'ADD' | 'SET' = 'ADD',
    performedBy = 'Nhân viên Pha chế',
  ) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu có ID "${ingredientId}".`);
    }

    const previousStock = Number(ingredient.stock);
    const newStock = action === 'ADD' ? previousStock + quantity : Math.max(0, quantity);
    const stockDiff = newStock - previousStock;

    const updated = await this.prisma.ingredient.update({
      where: { id: ingredientId },
      data:
        action === 'ADD'
          ? { stock: { increment: quantity } }
          : { stock: Math.max(0, quantity) },
    });

    // Ghi nhận Audit Log (RESTOCK nếu thêm, UPDATE nếu ghi đè)
    if (this.prisma.ingredientAuditLog) {
      try {
        await this.prisma.ingredientAuditLog.create({
          data: {
            ingredientId: updated.id,
            ingredientName: updated.name,
            action: action === 'ADD' ? IngredientLogAction.RESTOCK : IngredientLogAction.UPDATE,
            changeAmount: stockDiff,
            previousStock,
            newStock,
            unit: updated.unit,
            reason: action === 'ADD' ? `Nhập thêm kho +${quantity} ${updated.unit}` : `Điều chỉnh tồn kho thành ${quantity} ${updated.unit}`,
            performedBy,
          },
        });
      } catch (err) {
        this.logger.error('Lỗi khi ghi Audit Log RESTOCK/UPDATE:', err);
      }
    }

    // Tự động tính toán lại tồn kho của toàn bộ sản phẩm liên quan
    await this.recalculateAllProductsStock();

    return {
      id: updated.id,
      name: updated.name,
      stock: Number(updated.stock),
      unit: updated.unit,
    };
  }

  /**
   * Lấy lịch sử biến động kho nguyên liệu (Audit Log)
   */
  async getAuditLogs(limit = 100) {
    const logs = await this.prisma.ingredientAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      ingredientId: log.ingredientId,
      ingredientName: log.ingredientName,
      action: log.action,
      changeAmount: log.changeAmount !== null ? Number(log.changeAmount) : 0,
      previousStock: log.previousStock !== null ? Number(log.previousStock) : null,
      newStock: log.newStock !== null ? Number(log.newStock) : null,
      unit: log.unit,
      reason: log.reason,
      performedBy: log.performedBy || 'Hệ thống',
      createdAt: log.createdAt.toISOString(),
    }));
  }

  /**
   * Lấy toàn bộ danh sách công thức của các sản phẩm (nhóm theo từng sản phẩm)
   */
  async getAllRecipes() {
    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        priceS: true,
        priceM: true,
        priceL: true,
        category: {
          select: { id: true, name: true },
        },
        stock: true,
        isAvailable: true,
        recipeItems: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true, stock: true },
            },
          },
          orderBy: [{ size: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      priceS: Number(p.priceS),
      priceM: Number(p.priceM),
      priceL: Number(p.priceL),
      category: p.category?.name || 'Đồ uống',
      categoryId: p.category?.id,
      stock: p.stock,
      isAvailable: p.isAvailable,
      recipes: p.recipeItems.map((r) => ({
        id: r.id,
        productId: r.productId,
        ingredientId: r.ingredientId,
        size: r.size,
        amount: Number(r.amount),
        ingredient: r.ingredient ? {
          id: r.ingredient.id,
          name: r.ingredient.name,
          unit: r.ingredient.unit,
          stock: Number(r.ingredient.stock),
        } : null,
      })),
    }));
  }

  /**
   * Tính toán số ly tối đa của 1 sản phẩm theo công thức thắt nút cổ chai (Bottleneck)
   * Sử dụng size M làm chuẩn tồn kho sản phẩm
   */
  async calculateProductStock(productId: string): Promise<number> {
    const recipes = await this.prisma.recipeItem.findMany({
      where: {
        productId,
        size: Size.M,
      },
      include: {
        ingredient: true,
      },
    });

    if (!recipes || recipes.length === 0) {
      return 0;
    }

    let minCups = Number.MAX_SAFE_INTEGER;

    for (const item of recipes) {
      const stock = Number(item.ingredient.stock);
      const amount = Number(item.amount);

      if (amount <= 0) continue;

      const possibleCups = Math.floor(stock / amount);
      if (possibleCups < minCups) {
        minCups = possibleCups;
      }
    }

    const calculatedStock = minCups === Number.MAX_SAFE_INTEGER ? 0 : Math.max(0, minCups);
    const isAvailable = calculatedStock > 0;

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        stock: calculatedStock,
        isAvailable,
      },
    });

    return calculatedStock;
  }

  /**
   * Duyệt qua toàn bộ sản phẩm và tính toán lại stock theo nguyên liệu hiện có
   */
  async recalculateAllProductsStock() {
    const products = await this.prisma.product.findMany({
      select: { id: true },
    });

    for (const p of products || []) {
      await this.calculateProductStock(p.id);
    }
  }

  /**
   * Thêm sản phẩm mới kèm công thức định lượng ban đầu
   */
  async createProductWithRecipes(dto: CreateProductWithRecipesDto) {
    let categoryId = dto.categoryId;
    if (!categoryId) {
      const defaultCat = await this.prisma.category.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (!defaultCat) {
        const newCat = await this.prisma.category.create({
          data: { name: 'Đồ uống đặc biệt', description: 'Danh mục mặc định' },
        });
        categoryId = newCat.id;
      } else {
        categoryId = defaultCat.id;
      }
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        categoryId,
        priceS: dto.priceS,
        priceM: dto.priceM,
        priceL: dto.priceL,
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
        stock: 0,
        isAvailable: false,
      },
    });

    if (dto.recipes && dto.recipes.length > 0) {
      for (const r of dto.recipes) {
        if (r.amount > 0) {
          await this.prisma.recipeItem.create({
            data: {
              productId: product.id,
              ingredientId: r.ingredientId,
              size: r.size,
              amount: r.amount,
            },
          });
        }
      }
      await this.calculateProductStock(product.id);
    }

    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        recipeItems: { include: { ingredient: true } },
      },
    });
  }

  /**
   * Cập nhật toàn bộ công thức cho một sản phẩm và tính lại bottleneck tồn kho
   */
  async updateProductRecipes(productId: string, dto: UpdateProductRecipesDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có ID "${productId}".`);
    }

    // Xóa các công thức cũ
    await this.prisma.recipeItem.deleteMany({
      where: { productId },
    });

    // Thêm các công thức mới
    if (dto.recipes && dto.recipes.length > 0) {
      for (const item of dto.recipes) {
        if (Number(item.amount) > 0) {
          await this.prisma.recipeItem.create({
            data: {
              productId,
              ingredientId: item.ingredientId,
              size: item.size,
              amount: item.amount,
            },
          });
        }
      }
    }

    // Tính toán lại tồn kho sản phẩm theo công thức mới
    await this.calculateProductStock(productId);

    return this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        recipeItems: { include: { ingredient: true } },
      },
    });
  }

  /**
   * Tự động trừ tồn kho nguyên liệu khi một đơn hàng chuyển sang PAID hoặc chế biến PREPARING
   * Kèm Audit Log ORDER_DEDUCT (màu trắng thường)
   */
  async deductIngredientsForOrder(tx: any, orderId: string, performedBy?: string) {
    const db = tx || this.prisma;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order || !order.items || order.items.length === 0) {
      return;
    }

    // Kiểm tra xem đơn hàng đã được trừ nguyên liệu chưa (tránh trừ lặp)
    if (db.ingredientAuditLog) {
      const existingLog = await db.ingredientAuditLog.findFirst({
        where: {
          action: IngredientLogAction.ORDER_DEDUCT,
          reason: { contains: `Đơn hàng #${order.orderNumber}` },
        },
      });

      if (existingLog) {
        this.logger.log(`Đơn hàng #${order.orderNumber} đã được trừ nguyên liệu trước đó. Bỏ qua.`);
        return;
      }
    }

    for (const item of order.items) {
      const recipes = await db.recipeItem.findMany({
        where: {
          productId: item.productId,
          size: item.size,
        },
        include: {
          ingredient: true,
        },
      });

      for (const recipe of recipes) {
        const totalDeduct = Number(recipe.amount) * item.quantity;
        if (totalDeduct > 0) {
          await db.ingredient.update({
            where: { id: recipe.ingredientId },
            data: {
              stock: { decrement: totalDeduct },
            },
          });

          // Ghi nhận Audit Log (ORDER_DEDUCT - hiển thị màu trắng thường)
          if (db.ingredientAuditLog) {
            try {
              const ingName = recipe.ingredient?.name || `Nguyên liệu ${recipe.ingredientId}`;
              const ingUnit = recipe.ingredient?.unit || '';
              const prevStock = recipe.ingredient ? Number(recipe.ingredient.stock) : null;

              await db.ingredientAuditLog.create({
                data: {
                  ingredientId: recipe.ingredientId,
                  ingredientName: ingName,
                  action: IngredientLogAction.ORDER_DEDUCT,
                  changeAmount: -totalDeduct,
                  previousStock: prevStock,
                  newStock: prevStock !== null ? Math.max(0, prevStock - totalDeduct) : null,
                  unit: ingUnit,
                  reason: `Chế biến Đơn hàng #${order.orderNumber || ''} (${item.productName || 'Đồ uống'} [${item.size}] x${item.quantity})`,
                  performedBy: performedBy || `Đơn hàng #${order.orderNumber || ''}`,
                },
              });
            } catch (err) {
              this.logger.error('Lỗi khi ghi Audit Log ORDER_DEDUCT:', err);
            }
          }
        }
      }
    }

    // Sau khi trừ nguyên liệu, tính toán lại stock các món
    setImmediate(async () => {
      try {
        await this.recalculateAllProductsStock();
      } catch (err) {
        this.logger.error('Lỗi khi tính lại tồn kho sau chế biến:', err);
      }
    });
  }
}
