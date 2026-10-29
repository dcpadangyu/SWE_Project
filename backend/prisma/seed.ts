import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Cà phê',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Trà',
  },
];

const extraCoffee = [
  {
    id: 'extra-coffee',
    name: 'Thêm cà phê',
    price: 10000,
    isAvailable: true,
  },
];

const jelly = {
  id: 'jelly',
  name: 'Thạch',
  price: 5000,
  isAvailable: true,
};

const drinks = [
  {
    name: 'Cà phê sữa',
    description: 'Cà phê đậm vị kết hợp sữa đặc.',
    categoryId: categories[0].id,
    prices: [30000, 35000, 40000],
    stock: 30,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Americano',
    description: 'Espresso pha loãng với nước.',
    categoryId: categories[0].id,
    prices: [35000, 40000, 45000],
    stock: 25,
    isAvailable: true,
    toppingOptions: [],
  },
  {
    name: 'Cappuccino',
    description: 'Espresso kết hợp sữa tươi và bọt sữa.',
    categoryId: categories[0].id,
    prices: [40000, 45000, 50000],
    stock: 0,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Trà đào',
    description: 'Trà kết hợp đào ngâm và đào miếng.',
    categoryId: categories[1].id,
    prices: [34000, 39000, 44000],
    stock: 35,
    isAvailable: true,
    toppingOptions: [
      {
        id: 'extra-peach',
        name: 'Thêm đào',
        price: 8000,
        isAvailable: true,
      },
      jelly,
    ],
  },
  {
    name: 'Bạc xỉu',
    description: 'Sữa đặc kết hợp cà phê, vị nhẹ.',
    categoryId: categories[0].id,
    prices: [30000, 35000, 40000],
    stock: 20,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Latte',
    description: 'Espresso hòa cùng sữa tươi.',
    categoryId: categories[0].id,
    prices: [40000, 45000, 50000],
    stock: 18,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Mocha',
    description: 'Cà phê kết hợp chocolate và sữa tươi.',
    categoryId: categories[0].id,
    prices: [45000, 50000, 55000],
    stock: 15,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Trà vải',
    description: 'Trà kết hợp vải ngâm thơm ngọt.',
    categoryId: categories[1].id,
    prices: [34000, 39000, 44000],
    stock: 25,
    isAvailable: true,
    toppingOptions: [
      {
        id: 'extra-lychee',
        name: 'Thêm vải',
        price: 8000,
        isAvailable: true,
      },
      jelly,
    ],
  },
  {
    name: 'Trà chanh',
    description: 'Trà kết hợp chanh, vị chua ngọt nhẹ.',
    categoryId: categories[1].id,
    prices: [25000, 30000, 35000],
    stock: 40,
    isAvailable: true,
    toppingOptions: [jelly],
  },
  {
    name: 'Trà sen',
    description: 'Trà ướp hương sen, vị thanh dịu.',
    categoryId: categories[1].id,
    prices: [35000, 40000, 45000],
    stock: 12,
    isAvailable: false,
    toppingOptions: [jelly],
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const category of categories) {
      await tx.category.upsert({
        where: { id: category.id },
        create: category,
        update: { name: category.name },
      });
    }

    for (const [index, drink] of drinks.entries()) {
      const id = `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;

      const data = {
        name: drink.name,
        description: drink.description,
        imageUrl: null,
        categoryId: drink.categoryId,
        priceS: drink.prices[0],
        priceM: drink.prices[1],
        priceL: drink.prices[2],
        stock: drink.stock,
        isAvailable: drink.isAvailable,
        toppingOptions: drink.toppingOptions,
      };

      await tx.product.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    }
  });

  console.log('Đã seed 2 danh mục và 10 sản phẩm.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
