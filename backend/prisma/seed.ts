import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
    imageUrl:
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[0].id,
    prices: [30000, 35000, 40000],
    stock: 30,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Americano',
    description: 'Espresso pha loãng với nước.',
    imageUrl:
      'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[0].id,
    prices: [35000, 40000, 45000],
    stock: 25,
    isAvailable: true,
    toppingOptions: [],
  },
  {
    name: 'Cappuccino',
    description: 'Espresso kết hợp sữa tươi và bọt sữa.',
    imageUrl:
      'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[0].id,
    prices: [40000, 45000, 50000],
    stock: 0,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Trà đào',
    description: 'Trà kết hợp đào ngâm và đào miếng.',
    imageUrl:
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60',
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
    imageUrl:
      'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[0].id,
    prices: [30000, 35000, 40000],
    stock: 20,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Latte',
    description: 'Espresso hòa cùng sữa tươi.',
    imageUrl:
      'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[0].id,
    prices: [40000, 45000, 50000],
    stock: 18,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Mocha',
    description: 'Cà phê kết hợp chocolate và sữa tươi.',
    imageUrl:
      'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[0].id,
    prices: [45000, 50000, 55000],
    stock: 15,
    isAvailable: true,
    toppingOptions: extraCoffee,
  },
  {
    name: 'Trà vải',
    description: 'Trà kết hợp vải ngâm thơm ngọt.',
    imageUrl:
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=60',
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
    imageUrl:
      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[1].id,
    prices: [25000, 30000, 35000],
    stock: 40,
    isAvailable: true,
    toppingOptions: [jelly],
  },
  {
    name: 'Trà sen',
    description: 'Trà ướp hương sen, vị thanh dịu.',
    imageUrl:
      'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=60',
    categoryId: categories[1].id,
    prices: [35000, 40000, 45000],
    stock: 12,
    isAvailable: false,
    toppingOptions: [jelly],
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1. Nạp Categories
    for (const category of categories) {
      await tx.category.upsert({
        where: { id: category.id },
        create: category,
        update: { name: category.name },
      });
    }

    // 2. Nạp Drinks
    for (const [index, drink] of drinks.entries()) {
      const id = `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
      const data = {
        name: drink.name,
        description: drink.description,
        imageUrl: drink.imageUrl,
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

    // 3. Nạp Vouchers (VẪN NẰM TRONG TRANSACTION)
    const vouchers = [
      {
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 50000,
        maxDiscount: 20000,
        usageLimit: 100,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        isActive: true,
      },
      {
        code: 'BREW20K',
        discountType: 'FIXED_AMOUNT',
        discountValue: 20000,
        minOrderValue: 100000,
        maxDiscount: 20000,
        usageLimit: 50,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        isActive: true,
      },
      {
        code: 'FREESHIP',
        discountType: 'FIXED_AMOUNT',
        discountValue: 15000,
        minOrderValue: 70000,
        maxDiscount: 15000,
        usageLimit: 200,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        isActive: true,
      },
    ];

    for (const voucher of vouchers) {
      await tx.voucher.upsert({
        where: { code: voucher.code },
        create: voucher as any,
        update: voucher as any,
      });
    }

    // 4. Nạp User mặc định cho việc kiểm thử
    const saltRounds = 10;
    const defaultPasswordHash = await bcrypt.hash('123456', saltRounds);
    await tx.user.upsert({
      where: { email: ' ' },
      create: {
        email: 'customer@gmail.com',
        passwordHash: defaultPasswordHash,
        fullName: 'Nguyễn Văn A',
        role: 'CUSTOMER',
        loyaltyPoints: 0,
      },
      update: {
        passwordHash: defaultPasswordHash,
        fullName: 'Nguyễn Văn A',
        role: 'CUSTOMER',
      },
    });
  }); // <--- ĐÓNG TRANSACTION Ở ĐÂY LÀ ĐÚNG

  console.log('Đã seed 2 danh mục, 10 sản phẩm, 3 voucher và 1 tài khoản khách hàng mặc định (customer@gmail.com).');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
