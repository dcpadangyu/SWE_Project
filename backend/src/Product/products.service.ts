import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const categorySelect = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

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

  async findAll() {
    try {
      const products = await this.prisma.product.findMany({
        select: {
          id: true,
          name: true,
          imageUrl: true,
          priceM: true,
          category: { select: categorySelect },
          stock: true,
          isAvailable: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });

      return products.map((product) => ({
        ...product,
        priceM: product.priceM.toFixed(2),
      }));
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async findOne(id: string) {
    let product;

    try {
      product = await this.prisma.product.findUnique({
        where: { id },
        select: {
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
        },
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    return {
      ...product,
      priceS: product.priceS.toFixed(2),
      priceM: product.priceM.toFixed(2),
      priceL: product.priceL.toFixed(2),
    };
  }
}
