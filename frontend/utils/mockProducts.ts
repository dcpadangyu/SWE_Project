import { Product } from "@/types/brewlite";

const nowIso = "2026-10-29T00:00:00.000Z";

const extraCoffee = [
  { id: "extra-coffee", name: "Thêm cà phê", price: 10000, isAvailable: true },
];

const jelly = {
  id: "jelly",
  name: "Thạch",
  price: 5000,
  isAvailable: true,
};

/**
 * MẢNG DỮ LIỆU MẪU ĐỒNG BỘ 100% VỚI SEED DB backend/prisma/seed.ts
 * (FALLBACK AN TOÀN KHI CHƯA KẾT NỐI ĐƯỢC BACKEND)
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Cà phê sữa",
    category: "COFFEE",
    priceS: 30000,
    priceM: 35000,
    priceL: 40000,
    toppingOptions: extraCoffee,
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
    stock: 30,
    description: "Cà phê đậm vị kết hợp sữa đặc.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    name: "Americano",
    category: "COFFEE",
    priceS: 35000,
    priceM: 40000,
    priceL: 45000,
    toppingOptions: [],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=60",
    stock: 25,
    description: "Espresso pha loãng với nước.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    name: "Cappuccino",
    category: "COFFEE",
    priceS: 40000,
    priceM: 45000,
    priceL: 50000,
    toppingOptions: extraCoffee,
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60",
    stock: 20,
    description: "Espresso kết hợp sữa tươi và bọt sữa.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    name: "Trà đào",
    category: "TEA",
    priceS: 34000,
    priceM: 39000,
    priceL: 44000,
    toppingOptions: [
      { id: "extra-peach", name: "Thêm đào", price: 8000, isAvailable: true },
      jelly,
    ],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60",
    stock: 35,
    description: "Trà kết hợp đào ngâm và đào miếng.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    name: "Bạc xỉu",
    category: "COFFEE",
    priceS: 30000,
    priceM: 35000,
    priceL: 40000,
    toppingOptions: extraCoffee,
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=60",
    stock: 20,
    description: "Sữa đặc kết hợp cà phê, vị nhẹ.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    name: "Latte",
    category: "COFFEE",
    priceS: 40000,
    priceM: 45000,
    priceL: 50000,
    toppingOptions: extraCoffee,
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=60",
    stock: 18,
    description: "Espresso hòa cùng sữa tươi.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000007",
    name: "Mocha",
    category: "COFFEE",
    priceS: 45000,
    priceM: 50000,
    priceL: 55000,
    toppingOptions: extraCoffee,
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=60",
    stock: 15,
    description: "Cà phê kết hợp chocolate và sữa tươi.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000008",
    name: "Trà vải",
    category: "TEA",
    priceS: 34000,
    priceM: 39000,
    priceL: 44000,
    toppingOptions: [
      { id: "extra-lychee", name: "Thêm vải", price: 8000, isAvailable: true },
      jelly,
    ],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=60",
    stock: 25,
    description: "Trà kết hợp vải ngâm thơm ngọt.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000009",
    name: "Trà chanh",
    category: "TEA",
    priceS: 25000,
    priceM: 30000,
    priceL: 35000,
    toppingOptions: [jelly],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
    stock: 40,
    description: "Trà kết hợp chanh, vị chua ngọt nhẹ.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000010",
    name: "Trà sen",
    category: "TEA",
    priceS: 35000,
    priceM: 40000,
    priceL: 45000,
    toppingOptions: [jelly],
    isAvailable: false,
    imageUrl:
      "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=60",
    stock: 12,
    description: "Trà ướp hương sen, vị thanh dịu.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];
