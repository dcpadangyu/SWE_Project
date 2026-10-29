/**
 * Tiện ích tính toán giá bán sản phẩm (Pricing Utility)
 * 
 * Mục đích:
 * - Tập trung hóa công thức tính giá đồ uống cho toàn bộ hệ thống.
 * - Đảm bảo tính toán đồng nhất giữa giao diện chọn món (Next.js) và kiểm tra giá backend (NestJS).
 * 
 * Căn cứ yêu cầu:
 * - SRS FR-05: Lựa chọn size và topping (mặc định size M, tự động cập nhật giá).
 * - SRS FR-10: Tự động tính thành tiền từng món và tổng tiền giỏ hàng.
 * - SRS AC-10.2: Thành tiền = Đơn giá (đã gồm size và topping) x Số lượng.
 */

import { Product, Size, SelectedTopping } from '@/types/brewlite';

/**
 * Tính đơn giá của 1 ly đồ uống dựa trên kích cỡ (Size) và các Topping được chọn.
 * 
 * Công thức:
 * Đơn giá 1 ly = Giá theo Size (priceS / priceM / priceL) + Tổng phụ thu các Topping
 * 
 * @param product Đối tượng sản phẩm chứa giá gốc theo các size (S, M, L)
 * @param size Kích cỡ khách chọn ('S', 'M', 'L')
 * @param selectedToppings Danh sách các loại topping khách chọn thêm (mặc định rỗng [])
 * @returns Đơn giá hoàn chỉnh của 1 ly đồ uống (VND)
 */
export function calculateItemPrice(
  product: Product,
  size: Size,
  selectedToppings: SelectedTopping[] = []
): number {
  // 1. Xác định giá gốc theo Size (Mặc định là size M nếu không chọn)
  let basePrice = product.priceM;
  if (size === 'S') basePrice = product.priceS;
  if (size === 'L') basePrice = product.priceL;

  // 2. Tính tổng tiền phụ thu của tất cả các topping đã chọn
  const toppingTotal = selectedToppings.reduce((total, topping) => {
    return total + (topping.price || 0);
  }, 0);

  // 3. Trả về tổng đơn giá của 1 ly
  return basePrice + toppingTotal;
}

/**
 * Tính thành tiền của một dòng sản phẩm trong giỏ hàng.
 * 
 * Công thức:
 * Thành tiền = Đơn giá 1 ly x Số lượng
 * 
 * @param unitPrice Đơn giá 1 ly (đã gồm size và topping)
 * @param quantity Số lượng ly (>= 1)
 * @returns Tổng thành tiền của dòng món (VND)
 */
export function calculateLineSubtotal(unitPrice: number, quantity: number): number {
  if (quantity < 1) return 0;
  return unitPrice * quantity;
}
