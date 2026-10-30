import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';

const D = (v: number) => new Prisma.Decimal(v);

const sampleRow = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Cà phê sữa',
  description: 'Cà phê đậm vị kết hợp sữa đặc.',
  imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
  priceS: D(30000),
  priceM: D(35000),
  priceL: D(40000),
  toppingOptions: [
    { id: 'extra-coffee', name: 'Thêm cà phê', price: 10000, isAvailable: true },
  ],
  category: {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Cà phê',
  },
  stock: 30,
  isAvailable: true,
  version: 0,
  createdAt: new Date('2026-10-25T00:00:00.000Z'),
  updatedAt: new Date('2026-10-25T00:00:00.000Z'),
};

function makeService() {
  const prisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const service = new ProductsService(prisma as never);
  return { service, prisma };
}

describe('ProductsService (FR-03 & FR-04)', () => {
  describe('findAll (GET /products)', () => {
    it('AC-03.1, AC-03.2: Trả về danh sách đồ uống với giá kiểu number và category kiểu string', async () => {
      const { service, prisma } = makeService();
      prisma.product.findMany.mockResolvedValue([sampleRow]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: sampleRow.id,
        name: 'Cà phê sữa',
        description: 'Cà phê đậm vị kết hợp sữa đặc.',
        imageUrl: sampleRow.imageUrl,
        category: 'Cà phê',
        priceS: 30000,
        priceM: 35000,
        priceL: 40000,
        toppingOptions: [
          {
            id: 'extra-coffee',
            name: 'Thêm cà phê',
            price: 10000,
            isAvailable: true,
          },
        ],
        stock: 30,
        isAvailable: true,
        version: 0,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z',
      });
    });

    it('AC-03.4: Trả về mảng rỗng khi chưa có sản phẩm nào', async () => {
      const { service, prisma } = makeService();
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it('AC-03.5: Ném lỗi ServiceUnavailableException khi mất kết nối CSDL (P1001)', async () => {
      const { service, prisma } = makeService();
      prisma.product.findMany.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Can not reach DB', {
          code: 'P1001',
          clientVersion: 'test',
        }),
      );

      await expect(service.findAll()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('findOne (GET /products/:id)', () => {
    it('AC-04.2: Trả về chi tiết sản phẩm khi ID tồn tại', async () => {
      const { service, prisma } = makeService();
      prisma.product.findUnique.mockResolvedValue(sampleRow);

      const result = await service.findOne(sampleRow.id);

      expect(result.id).toBe(sampleRow.id);
      expect(result.priceM).toBe(35000);
      expect(result.toppingOptions).toHaveLength(1);
    });

    it('AC-04.3: Ném lỗi NotFoundException (404) khi sản phẩm không tồn tại', async () => {
      const { service, prisma } = makeService();
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('20000000-0000-4000-8000-000000000099'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
