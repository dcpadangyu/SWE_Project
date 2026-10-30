import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Product, ToppingOption } from '../common/types/brewlite';

const categorySelect = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

const productSelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  priceS: true,
  priceM: true,
  priceL: true,
  toppingOptions: true,
  category: { select: categorySelect },
  stock: true,
  isAvailable: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type RawProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function normalizeToppingOptions(raw: Prisma.JsonValue): ToppingOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Prisma.JsonObject =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    )
    .map((item) => ({
      id: typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : '',
      name: typeof item.name === 'string' ? item.name : '',
      price: Number(item.price ?? 0),
      isAvailable: item.isAvailable !== false,
    }))
    .filter((item) => item.id.length > 0);
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private rethrowDatabaseError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code)
    ) {
      throw new ServiceUnavailableException(
        'Tạm thời không thể tải dữ liệu. Vui lòng thử lại sau.',
      );
    }

    throw error;
  }

  private toProductResponse(product: RawProduct): Product {
    return {
      id: product.id,
      name: product.name,
      description: product.description ?? undefined,
      imageUrl: product.imageUrl ?? undefined,
      category: product.category?.name ?? undefined,
      priceS: Number(product.priceS),
      priceM: Number(product.priceM),
      priceL: Number(product.priceL),
      toppingOptions: normalizeToppingOptions(product.toppingOptions),
      stock: product.stock,
      isAvailable: product.isAvailable,
      version: product.version,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<Product[]> {
    try {
      const products = await this.prisma.product.findMany({
        select: productSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });

      return products.map((product) => this.toProductResponse(product));
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async findOne(id: string): Promise<Product> {
    let product: RawProduct | null = null;

    try {
      product = await this.prisma.product.findUnique({
        where: { id },
        select: productSelect,
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    return this.toProductResponse(product);
  }
}
