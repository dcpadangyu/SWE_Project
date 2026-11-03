import { Product } from "@/types/brewlite";

const nowIso = "2026-10-29T00:00:00.000Z";

/**
 * MẢNG DỮ LIỆU MẪU ĐỒNG BỘ VỚI SEED DB (FALLBACK KHI CHƯA BẬT BACKEND)
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Cappuccino",
    category: "COFFEE",
    priceS: 40000,
    priceM: 45000,
    priceL: 52000,
    toppingOptions: [
      { id: "extra-shot", name: "Extra shot", price: 10000, isAvailable: true },
      { id: "vanilla-syrup", name: "Siro vani", price: 7000, isAvailable: true },
      { id: "oat-milk", name: "Sữa yến mạch", price: 12000, isAvailable: true },
    ],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60",
    stock: 20,
    description: "Espresso kết hợp sữa tươi đánh nóng và lớp bọt mịn.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    name: "Cà phê sữa",
    category: "COFFEE",
    priceS: 29000,
    priceM: 35000,
    priceL: 42000,
    toppingOptions: [
      { id: "extra-shot", name: "Extra shot", price: 10000, isAvailable: true },
      { id: "condensed-milk", name: "Thêm sữa đặc", price: 5000, isAvailable: true },
    ],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=60",
    stock: 30,
    description: "Cà phê phin đậm đà hòa quyện sữa đặc truyền thống.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    name: "Americano",
    category: "COFFEE",
    priceS: 32000,
    priceM: 38000,
    priceL: 45000,
    toppingOptions: [
      { id: "extra-shot", name: "Extra shot", price: 10000, isAvailable: true },
      { id: "honey", name: "Mật ong", price: 7000, isAvailable: true },
    ],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=60",
    stock: 25,
    description: "Espresso pha cùng nước lọc, vị thanh và hậu ngọt nhẹ.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    name: "Trà đào",
    category: "TEA",
    priceS: 35000,
    priceM: 39000,
    priceL: 44000,
    toppingOptions: [
      { id: "extra-peach", name: "Thêm đào", price: 8000, isAvailable: true },
      { id: "jelly", name: "Thạch", price: 5000, isAvailable: true },
    ],
    isAvailable: true,
    imageUrl:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60",
    stock: 18,
    description: "Trà đen ủ lạnh kết hợp đào ngâm và hương cam sả.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    name: "Bạc xỉu",
    category: "COFFEE",
    priceS: 29000,
    priceM: 35000,
    priceL: 42000,
    toppingOptions: [
      { id: "extra-shot", name: "Extra shot", price: 10000, isAvailable: true },
      { id: "caramel-sauce", name: "Sốt caramel", price: 7000, isAvailable: true },
    ],
    isAvailable: false,
    imageUrl:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=60",
    stock: 0,
    description: "Sữa tươi béo nhẹ kết hợp chút cà phê thơm dịu.",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];
