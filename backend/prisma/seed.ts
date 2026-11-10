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
      where: { email: 'customer@gmail.com' },
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

    // 5. Nạp tài khoản Staff / Barista kiểm thử
    await tx.user.upsert({
      where: { email: 'staff@gmail.com' },
      create: {
        email: 'staff@gmail.com',
        passwordHash: defaultPasswordHash,
        fullName: 'Nhân viên Pha chế BrewLite',
        role: 'BARISTA',
        loyaltyPoints: 0,
      },
      update: {
        passwordHash: defaultPasswordHash,
        fullName: 'Nhân viên Pha chế BrewLite',
        role: 'BARISTA',
      },
    });

    // 6. Nạp Nguyên liệu ban đầu (Ingredients)
    const initialIngredients = [
      { id: 'ing-coffee', name: 'Hạt cà phê Robusta', unit: 'g', stock: 10000, minThreshold: 500 },
      { id: 'ing-condensed-milk', name: 'Sữa đặc Ngôi Sao Phương Nam', unit: 'ml', stock: 5000, minThreshold: 300 },
      { id: 'ing-fresh-milk', name: 'Sữa tươi không đường Barista', unit: 'ml', stock: 5000, minThreshold: 400 },
      { id: 'ing-sugar', name: 'Đường kính trắng', unit: 'g', stock: 3000, minThreshold: 200 },
      { id: 'ing-peach-tea', name: 'Trà đào Cozy', unit: 'g', stock: 2000, minThreshold: 100 },
      { id: 'ing-peach-fruit', name: 'Đào ngâm miếng', unit: 'cái', stock: 100, minThreshold: 10 },
      { id: 'ing-lychee', name: 'Hương vải & vải ngâm', unit: 'g', stock: 1500, minThreshold: 100 },
      { id: 'ing-lotus-tea', name: 'Bột trà sen cao cấp', unit: 'g', stock: 1500, minThreshold: 100 },
      { id: 'ing-lemon', name: 'Chanh tươi', unit: 'g', stock: 1000, minThreshold: 50 },
      { id: 'ing-chocolate', name: 'Chocolate cao cấp', unit: 'g', stock: 1000, minThreshold: 50 },
    ];

    for (const ing of initialIngredients) {
      await tx.ingredient.upsert({
        where: { id: ing.id },
        create: ing,
        update: {
          name: ing.name,
          unit: ing.unit,
          stock: ing.stock,
          minThreshold: ing.minThreshold,
        },
      });
    }

    // 7. Nạp Công thức định lượng theo Size S, M, L cho các đồ uống (Recipe Items)
    // Map productId theo index của drinks (20000000-0000-4000-8000-000000000001 -> 10)
    const getProdId = (idx: number) => `20000000-0000-4000-8000-${String(idx).padStart(12, '0')}`;

    const recipes = [
      // 1: Cà phê sữa: Cà phê + Sữa đặc
      { prodIdx: 1, ingId: 'ing-coffee', size: 'S', amount: 20 },
      { prodIdx: 1, ingId: 'ing-condensed-milk', size: 'S', amount: 30 },
      { prodIdx: 1, ingId: 'ing-coffee', size: 'M', amount: 25 },
      { prodIdx: 1, ingId: 'ing-condensed-milk', size: 'M', amount: 40 },
      { prodIdx: 1, ingId: 'ing-coffee', size: 'L', amount: 35 },
      { prodIdx: 1, ingId: 'ing-condensed-milk', size: 'L', amount: 50 },

      // 2: Americano: Cà phê
      { prodIdx: 2, ingId: 'ing-coffee', size: 'S', amount: 20 },
      { prodIdx: 2, ingId: 'ing-coffee', size: 'M', amount: 25 },
      { prodIdx: 2, ingId: 'ing-coffee', size: 'L', amount: 35 },

      // 3: Cappuccino: Cà phê + Sữa tươi
      { prodIdx: 3, ingId: 'ing-coffee', size: 'S', amount: 20 },
      { prodIdx: 3, ingId: 'ing-fresh-milk', size: 'S', amount: 60 },
      { prodIdx: 3, ingId: 'ing-coffee', size: 'M', amount: 25 },
      { prodIdx: 3, ingId: 'ing-fresh-milk', size: 'M', amount: 80 },
      { prodIdx: 3, ingId: 'ing-coffee', size: 'L', amount: 35 },
      { prodIdx: 3, ingId: 'ing-fresh-milk', size: 'L', amount: 100 },

      // 4: Trà đào: Trà đào + Đường + Đào ngâm miếng
      { prodIdx: 4, ingId: 'ing-peach-tea', size: 'S', amount: 15 },
      { prodIdx: 4, ingId: 'ing-sugar', size: 'S', amount: 20 },
      { prodIdx: 4, ingId: 'ing-peach-fruit', size: 'S', amount: 2 },
      { prodIdx: 4, ingId: 'ing-peach-tea', size: 'M', amount: 20 },
      { prodIdx: 4, ingId: 'ing-sugar', size: 'M', amount: 25 },
      { prodIdx: 4, ingId: 'ing-peach-fruit', size: 'M', amount: 3 },
      { prodIdx: 4, ingId: 'ing-peach-tea', size: 'L', amount: 25 },
      { prodIdx: 4, ingId: 'ing-sugar', size: 'L', amount: 35 },
      { prodIdx: 4, ingId: 'ing-peach-fruit', size: 'L', amount: 4 },

      // 5: Bạc xỉu: Cà phê (ít) + Sữa đặc (nhiều) + Sữa tươi
      { prodIdx: 5, ingId: 'ing-coffee', size: 'S', amount: 10 },
      { prodIdx: 5, ingId: 'ing-condensed-milk', size: 'S', amount: 40 },
      { prodIdx: 5, ingId: 'ing-fresh-milk', size: 'S', amount: 30 },
      { prodIdx: 5, ingId: 'ing-coffee', size: 'M', amount: 15 },
      { prodIdx: 5, ingId: 'ing-condensed-milk', size: 'M', amount: 50 },
      { prodIdx: 5, ingId: 'ing-fresh-milk', size: 'M', amount: 40 },
      { prodIdx: 5, ingId: 'ing-coffee', size: 'L', amount: 20 },
      { prodIdx: 5, ingId: 'ing-condensed-milk', size: 'L', amount: 60 },
      { prodIdx: 5, ingId: 'ing-fresh-milk', size: 'L', amount: 50 },

      // 6: Latte: Cà phê + Sữa tươi
      { prodIdx: 6, ingId: 'ing-coffee', size: 'S', amount: 18 },
      { prodIdx: 6, ingId: 'ing-fresh-milk', size: 'S', amount: 80 },
      { prodIdx: 6, ingId: 'ing-coffee', size: 'M', amount: 22 },
      { prodIdx: 6, ingId: 'ing-fresh-milk', size: 'M', amount: 100 },
      { prodIdx: 6, ingId: 'ing-coffee', size: 'L', amount: 28 },
      { prodIdx: 6, ingId: 'ing-fresh-milk', size: 'L', amount: 130 },

      // 7: Mocha: Cà phê + Chocolate + Sữa tươi
      { prodIdx: 7, ingId: 'ing-coffee', size: 'S', amount: 18 },
      { prodIdx: 7, ingId: 'ing-chocolate', size: 'S', amount: 15 },
      { prodIdx: 7, ingId: 'ing-fresh-milk', size: 'S', amount: 60 },
      { prodIdx: 7, ingId: 'ing-coffee', size: 'M', amount: 22 },
      { prodIdx: 7, ingId: 'ing-chocolate', size: 'M', amount: 20 },
      { prodIdx: 7, ingId: 'ing-fresh-milk', size: 'M', amount: 80 },
      { prodIdx: 7, ingId: 'ing-coffee', size: 'L', amount: 28 },
      { prodIdx: 7, ingId: 'ing-chocolate', size: 'L', amount: 25 },
      { prodIdx: 7, ingId: 'ing-fresh-milk', size: 'L', amount: 100 },

      // 8: Trà vải: Hương vải + Đường
      { prodIdx: 8, ingId: 'ing-lychee', size: 'S', amount: 20 },
      { prodIdx: 8, ingId: 'ing-sugar', size: 'S', amount: 20 },
      { prodIdx: 8, ingId: 'ing-lychee', size: 'M', amount: 30 },
      { prodIdx: 8, ingId: 'ing-sugar', size: 'M', amount: 25 },
      { prodIdx: 8, ingId: 'ing-lychee', size: 'L', amount: 40 },
      { prodIdx: 8, ingId: 'ing-sugar', size: 'L', amount: 30 },

      // 9: Trà chanh: Chanh + Đường
      { prodIdx: 9, ingId: 'ing-lemon', size: 'S', amount: 15 },
      { prodIdx: 9, ingId: 'ing-sugar', size: 'S', amount: 20 },
      { prodIdx: 9, ingId: 'ing-lemon', size: 'M', amount: 20 },
      { prodIdx: 9, ingId: 'ing-sugar', size: 'M', amount: 25 },
      { prodIdx: 9, ingId: 'ing-lemon', size: 'L', amount: 30 },
      { prodIdx: 9, ingId: 'ing-sugar', size: 'L', amount: 35 },

      // 10: Trà sen: Bột trà sen + Đường
      { prodIdx: 10, ingId: 'ing-lotus-tea', size: 'S', amount: 15 },
      { prodIdx: 10, ingId: 'ing-sugar', size: 'S', amount: 15 },
      { prodIdx: 10, ingId: 'ing-lotus-tea', size: 'M', amount: 20 },
      { prodIdx: 10, ingId: 'ing-sugar', size: 'M', amount: 20 },
      { prodIdx: 10, ingId: 'ing-lotus-tea', size: 'L', amount: 25 },
      { prodIdx: 10, ingId: 'ing-sugar', size: 'L', amount: 25 },
    ];

    for (const r of recipes) {
      const prodId = getProdId(r.prodIdx);
      const recipeId = `rec-${r.prodIdx}-${r.ingId}-${r.size}`;
      await tx.recipeItem.upsert({
        where: { id: recipeId },
        create: {
          id: recipeId,
          productId: prodId,
          ingredientId: r.ingId,
          size: r.size as any,
          amount: r.amount,
        },
        update: {
          amount: r.amount,
        },
      });
    }

    // 8. Tự động tính toán số ly tối đa (Bottleneck formula) và cập nhật Product.stock
    for (let i = 1; i <= 10; i++) {
      const prodId = getProdId(i);
      const prodRecipes = recipes.filter((r) => r.prodIdx === i && r.size === 'M'); // Lấy size M chuẩn
      if (prodRecipes.length === 0) continue;

      let maxCups = 999999;
      for (const pr of prodRecipes) {
        const ing = initialIngredients.find((ing) => ing.id === pr.ingId);
        if (ing) {
          const cups = Math.floor(ing.stock / pr.amount);
          if (cups < maxCups) maxCups = cups;
        }
      }

      await tx.product.update({
        where: { id: prodId },
        data: {
          stock: maxCups === 999999 ? 0 : maxCups,
          isAvailable: maxCups > 0,
        },
      });
    }
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
