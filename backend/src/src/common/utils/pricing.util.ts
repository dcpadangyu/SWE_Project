/**
 * Tiện ích tính toán giá bán sản phẩm phía Backend (NestJS Pricing Utility)
 * 
 * Mục đích:
 * - Dùng để tính toán lại giá độc lập ở phía Server (Backend tự định giá, không tin giá Client gửi lên).
 * - Phục vụ kiểm tra dữ liệu giỏ hàng trước khi tạo Order (tránh gian lận sửa giá trên Frontend).
 * 
 * Căn cứ yêu cầu:
 * - SRS AC-12.3: Hệ thống tự động tính toán lại thành tiền từng món và tổng tiền đơn hàng
 *   dựa trên cơ sở dữ liệu (tuyệt đối không nhận tổng tiền gửi trực tiếp từ client).
 */

import { Product, Size, SelectedTopping } from '../types/brewlite';

/**
 * Tính đơn giá của 1 ly đồ uống dựa trên kích cỡ (Size) và các Topping được chọn.
 * 
 * @param product Bản ghi sản phẩm lấy trực tiếp từ cơ sở dữ liệu
 * @param size Kích cỡ khách đặt ('S', 'M', 'L')
 * @param selectedToppings Danh sách topping hợp lệ
 * @returns Đơn giá chính xác của 1 ly đồ uống (VND)
 */
export function calculateItemPrice(
  product: Product,
  size: Size,
  selectedToppings: SelectedTopping[] = []
): number {
  let basePrice = product.priceM;
  if (size === 'S') basePrice = product.priceS;
  if (size === 'L') basePrice = product.priceL;

  const toppingTotal = selectedToppings.reduce((total, topping) => {
    return total + (topping.price || 0);
  }, 0);

  return basePrice + toppingTotal;
}

/**
 * Tính thành tiền của một dòng sản phẩm trong đơn hàng.
 * 
 * @param unitPrice Đơn giá 1 ly
 * @param quantity Số lượng ly
 * @returns Thành tiền dòng sản phẩm (VND)
 */
export function calculateLineSubtotal(unitPrice: number, quantity: number): number {
  if (quantity < 1) return 0;
  return unitPrice * quantity;
}
