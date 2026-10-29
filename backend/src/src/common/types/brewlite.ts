/**
 * ============================================================================
 * BREWLITE - ĐỊNH NGHĨA KIỂU DỮ LIỆU MIỀN DÙNG CHUNG (DOMAIN SHARED TYPES)
 * ============================================================================
 * 
 * Mục đích tệp:
 * - Đóng vai trò là "Khế ước dữ liệu" (Data Contract) duy nhất giữa Next.js và NestJS.
 * - Khớp 100% với Sơ đồ lớp miền (Class Diagram Task 2.3) và Đặc tả yêu cầu (SRS Task 1.2).
 * - Tệp này CHỈ CHỨA kiểu dữ liệu (Types, Interfaces, Enums), không chứa mã logic thực thi,
 *   đảm bảo nguyên tắc phân tách trách nhiệm (Separation of Concerns).
 */

// ============================================================================
// 1. CÁC ENUM TRẠNG THÁI & PHÂN LOẠI HỆ THỐNG
// ============================================================================

/**
 * Vai trò người dùng trong hệ thống BrewLite
 * - CUSTOMER: Khách hàng (người đặt món và thanh toán)
 * - BARISTA: Nhân viên pha chế tại quầy (tiếp nhận đơn và giao nước)
 * - ADMIN: Quản trị viên hệ thống / Quản lý cửa hàng (quản lý menu và tồn kho)
 */
export type Role = 'CUSTOMER' | 'BARISTA' | 'ADMIN';

/**
 * Ba kích cỡ đồ uống chuẩn của quán
 * - S: Cỡ nhỏ (Small)
 * - M: Cỡ vừa (Medium - kích thước mặc định)
 * - L: Cỡ lớn (Large)
 */
export type Size = 'S' | 'M' | 'L';

/**
 * Máy trạng thái đơn hàng (Order State Machine) gồm 7 trạng thái chuẩn (ADR-003):
 * - PENDING: Vừa tạo đơn, đang chờ thanh toán
 * - PAID: Đã thanh toán không tiền mặt thành công qua Mock Payment Gateway
 * - PREPARING: Barista tại quầy đang tiến hành pha chế đồ uống
 * - READY: Đã pha xong, sẵn sàng để khách đến quầy nhận nước
 * - COMPLETED: Đã bàn giao đồ uống cho khách (Trạng thái kết thúc thành công)
 * - PAYMENT_FAILED: Cổng thanh toán báo lỗi (cho phép thử lại tối đa 3 lần)
 * - CANCELLED: Đơn hàng bị hủy (Trạng thái kết thúc đóng)
 */
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'PAYMENT_FAILED'
  | 'CANCELLED';

/**
 * Phương thức thanh toán không dùng tiền mặt (FR-13)
 * - E_WALLET: Ví điện tử (MoMo, ZaloPay, ShopeePay mô phỏng)
 * - BANK_CARD: Thẻ ngân hàng nội địa / Quốc tế qua cổng mô phỏng
 */
export type PaymentMethod = 'E_WALLET' | 'BANK_CARD';

/**
 * Trạng thái của một lần thử thanh toán (Payment Attempt)
 */
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

/**
 * Hình thức giảm giá của Voucher (A1)
 * - PERCENTAGE: Giảm theo phần trăm (ví dụ: giảm 10%, 20%)
 * - FIXED_AMOUNT: Giảm số tiền cố định (ví dụ: giảm 15.000 VND)
 */
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

// ============================================================================
// 2. MÔ HÌNH THỰC THỂ SẢN PHẨM & TOPPING
// ============================================================================

/**
 * Tùy chọn topping đính kèm của sản phẩm (FR-05)
 */
export interface ToppingOption {
  id: string;          // Định danh duy nhất của topping
  name: string;        // Tên topping (ví dụ: Trân châu đen, Kem cheese)
  price: number;       // Giá bán của topping trên mỗi ly (VND)
  isAvailable: boolean;// Tình trạng còn hàng để phục vụ
}

/**
 * Thực thể Sản phẩm đồ uống trên Thực đơn (FR-03, FR-04)
 */
export interface Product {
  id: string;                       // Khóa chính UUID
  name: string;                     // Tên món (ví dụ: Cà phê sữa đá, Cappuccino)
  description?: string;             // Mô tả chi tiết thành phần, hương vị
  imageUrl?: string;                // Đường dẫn hình ảnh hiển thị trên Menu
  category?: string;                // Nhóm món (Cà phê, Trà trái cây, Đá xay...)
  priceS: number;                   // Giá bán size S (chưa gồm topping)
  priceM: number;                   // Giá bán size M (kích thước mặc định)
  priceL: number;                   // Giá bán size L
  toppingOptions: ToppingOption[];  // Danh sách các topping được phép thêm vào món này
  stock: number;                    // Số lượng ly còn có thể bán trong ngày
  isAvailable: boolean;             // Cửa hàng có đang mở bán món này không
  createdAt?: string;               // Thời điểm tạo món
  updatedAt?: string;               // Thời điểm cập nhật món gần nhất
  version?: number;                 // Số phiên bản dùng cho Optimistic Locking khi trừ tồn kho
}

// ============================================================================
// 3. MÔ HÌNH GIỎ HÀNG PHÍA CLIENT (CLIENT-SIDE CART STATE)
// ============================================================================

/**
 * Thông tin topping đã được khách hàng lựa chọn cho một ly đồ uống
 */
export interface SelectedTopping {
  id: string;    // ID của topping
  name: string;  // Tên topping đã chọn
  price: number; // Giá tiền topping tại thời điểm chọn
}

/**
 * Một dòng món trong giỏ hàng (FR-06, FR-07)
 * - Mỗi dòng đại diện cho một cấu hình duy nhất: (ProductId + Size + Danh sách Toppings)
 * - Nếu thêm cùng sản phẩm, cùng size, cùng topping -> gộp số lượng (AC-06.4)
 * - Nếu khác size hoặc khác topping -> tạo dòng riêng biệt (AC-06.5)
 */
export interface CartItem {
  id: string;                         // Khóa định danh duy nhất của dòng món trong giỏ
  productId: string;                  // ID sản phẩm tham chiếu
  productName: string;                // Tên sản phẩm hiển thị
  imageUrl?: string;                  // Ảnh sản phẩm thu nhỏ
  size: Size;                         // Kích cỡ đã chọn (S, M, L)
  selectedToppings: SelectedTopping[];// Danh sách topping đã chọn
  unitPrice: number;                  // Đơn giá 1 ly = Giá size + Tổng phụ thu topping
  quantity: number;                   // Số lượng ly đặt (>= 1)
  subtotal: number;                   // Thành tiền dòng = unitPrice * quantity
}

// ============================================================================
// 4. MÔ HÌNH ĐƠN HÀNG & CHI TIẾT ĐƠN HÀNG (ORDER & ORDER DETAIL)
// ============================================================================

/**
 * Bản chụp chi tiết một món trong đơn hàng đã tạo (OrderDetail / OrderItem)
 */
export interface OrderDetail {
  id?: string;                        // ID bản ghi chi tiết
  productId: string;                  // ID sản phẩm
  productName: string;                // Tên sản phẩm chụp tại thời điểm đặt
  size: Size;                         // Kích cỡ
  quantity: number;                   // Số lượng ly
  selectedToppings: SelectedTopping[];// Danh sách topping chụp tại thời điểm đặt
  unitPrice: number;                  // Đơn giá chụp tại thời điểm đặt (không đổi khi giá menu đổi)
  subtotal: number;                   // Thành tiền dòng món
}

/**
 * Thực thể Đơn hàng lưu trữ trong Cơ sở dữ liệu (FR-12, FR-14)
 */
export interface Order {
  id: string;             // Khóa chính UUID của đơn hàng
  orderCode: string;      // Mã đơn hiển thị dạng thân thiện cho khách (ví dụ: "#1042")
  userId: string;         // ID người dùng sở hữu đơn hàng
  status: OrderStatus;    // Trạng thái hiện tại trong máy trạng thái
  subtotal: number;       // Tổng tiền món trước giảm giá
  discountAmount: number; // Số tiền giảm từ voucher (mặc định 0)
  totalAmount: number;    // Tổng số tiền cuối cùng khách phải thanh toán (subtotal - discount)
  voucherCode?: string;   // Mã voucher đã áp dụng (nếu có)
  items: OrderDetail[];   // Danh sách các dòng món trong đơn
  note?: string;          // Ghi chú của khách hàng (ít đường, nhiều đá...)
  checkoutKey?: string;   // Khóa Idempotency-Key chống trừ tiền hoặc tạo đơn 2 lần
  createdAt: string;      // Thời điểm đặt đơn
  updatedAt?: string;     // Thời điểm cập nhật đơn gần nhất
}

// ============================================================================
// 5. MÔ HÌNH TÀI KHOẢN NGƯỜI DÙNG & TÍCH ĐIỂM (USER & LOYALTY)
// ============================================================================

/**
 * Thông tin tài khoản người dùng hiển thị an toàn (không chứa password hash)
 */
export interface User {
  id: string;             // Khóa chính UUID
  email: string;          // Email dùng để đăng nhập
  fullName?: string;      // Họ và tên người dùng
  phoneNumber?: string;   // Số điện thoại nhận nước
  role: Role;             // Quyền hạn tài khoản
  loyaltyPoints: number;  // Điểm thưởng tích lũy (cộng khi thanh toán đơn thành công)
  createdAt?: string;     // Ngày tạo tài khoản
}

// ============================================================================
// 6. MÔ HÌNH GIAO DỊCH THANH TOÁN (PAYMENT TRANSACTION)
// ============================================================================

/**
 * Lịch sử một lần thử thanh toán của đơn hàng (Payment Attempt - FR-13)
 */
export interface Payment {
  id: string;                     // Khóa chính UUID của giao dịch
  orderId: string;                // ID đơn hàng cần thanh toán
  attemptNumber: number;          // Số thứ tự lần thử (tối đa 3 lần: 1, 2, 3)
  idempotencyKey: string;         // Khóa chống lặp giao dịch khi rớt mạng
  paymentMethod: PaymentMethod;   // Ví điện tử hoặc Thẻ ngân hàng
  amount: number;                 // Số tiền thanh toán (khớp với order.totalAmount)
  status: PaymentStatus;          // Trạng thái giao dịch (PENDING, SUCCESS, FAILED...)
  transactionCode?: string;       // Mã tham chiếu từ cổng thanh toán Mock trả về
  errorCode?: string;             // Mã lỗi nếu thanh toán bị từ chối
  errorMessage?: string;          // Thông báo lỗi thân thiện hiển thị cho khách
  createdAt: string;              // Thời điểm tạo giao dịch
  completedAt?: string;           // Thời điểm nhận kết quả từ cổng thanh toán
  refundedAt?: string;            // Thời điểm hoàn tiền (nếu hủy đơn sau khi đã trừ tiền)
}

// ============================================================================
// 7. MÔ HÌNH VOUCHER KHUYẾN MÃI (PROMOTION / VOUCHER)
// ============================================================================

/**
 * Thông tin mã giảm giá (A1 Luồng thay thế)
 */
export interface Voucher {
  id: string;                 // Khóa chính UUID
  code: string;               // Mã khách nhập (ví dụ: "BREWNEW10", "CHAOBAN")
  discountType: DiscountType; // Giảm theo % hoặc giảm theo số tiền cố định
  discountValue: number;      // Giá trị giảm (ví dụ: 10% hoặc 20.000 VND)
  minOrderValue: number;      // Giá trị đơn hàng tối thiểu để được áp dụng
  maxDiscount?: number;       // Mức giảm tối đa đối với voucher theo phần trăm
  usageLimit: number;         // Tổng số lượt sử dụng tối đa của toàn hệ thống
  usedCount: number;          // Số lượt đã được sử dụng thành công
  startDate: string;          // Thời gian bắt đầu hiệu lực
  endDate: string;            // Thời gian hết hạn
  isActive: boolean;          // Trạng thái kích hoạt của voucher
}

// ============================================================================
// 8. CÁC ĐỐI TƯỢNG TRUYỀN TẢI DỮ LIỆU API (DATA TRANSFER OBJECTS - DTO)
// ============================================================================

/**
 * DTO một món khi gửi yêu cầu tạo đơn hàng lên Backend
 */
export interface CreateOrderItemDto {
  productId: string;    // ID món cần mua
  size: Size;           // Kích cỡ lựa chọn (S, M, L)
  toppingIds?: string[];// Danh sách ID topping lựa chọn thêm
  quantity: number;     // Số lượng ly đặt (>= 1)
}

/**
 * Payload yêu cầu gửi qua POST /orders
 */
export interface CreateOrderRequest {
  items: CreateOrderItemDto[]; // Danh sách món trong giỏ hàng
  voucherCode?: string;        // Mã giảm giá nếu khách có nhập
  note?: string;               // Ghi chú của khách hàng
}

/**
 * Payload yêu cầu gửi qua POST /payments
 */
export interface ProcessPaymentRequest {
  orderId: string;              // Mã đơn hàng cần thanh toán
  paymentMethod: PaymentMethod; // Phương thức chọn: 'E_WALLET' hoặc 'BANK_CARD'
}

/**
 * Định dạng phản hồi chuẩn (Standard API Response) từ Backend
 */
export interface ApiResponse<T> {
  success: boolean;       // Thao tác thành công hay thất bại
  data?: T;               // Dữ liệu nghiệp vụ trả về khi thành công
  message?: string;       // Thông báo kết quả cho người dùng
  statusCode?: number;    // Mã trạng thái HTTP (200, 201, 400, 404, 500...)
  timestamp?: string;     // Mốc thời gian xử lý yêu cầu
}
