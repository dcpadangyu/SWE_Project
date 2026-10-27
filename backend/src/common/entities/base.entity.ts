/**
 * ============================================================================
 * BASE ENTITY (THỰC THỂ CƠ SỞ DÙNG CHUNG PHÍA BACKEND)
 * ============================================================================
 * 
 * Mục đích:
 * - Định nghĩa các trường dữ liệu bắt buộc có mặt trong hầu hết các bảng CSDL:
 *   1. id: Khóa chính (UUID v4 hoặc CUID dạng chuỗi ký tự)
 *   2. createdAt: Mốc thời gian tạo bản ghi (Audit log)
 *   3. updatedAt: Mốc thời gian cập nhật bản ghi gần nhất (Audit log)
 * - Đảm bảo tính nhất quán giữa các thực thể nghiệp vụ (User, Product, Order, Payment...)
 *   theo đúng Sơ đồ lớp miền (Class Diagram) và quy chuẩn Task 1.
 */

export abstract class BaseEntity {
  /**
   * Khóa chính duy nhất của bản ghi (Primary Key)
   * Ví dụ: "clh3d8z9p00003b6w8m3x2a1k" hoặc UUID v4
   */
  id: string;

  /**
   * Thời điểm khởi tạo bản ghi trong cơ sở dữ liệu
   */
  createdAt: Date;

  /**
   * Thời điểm cập nhật dữ liệu lần cuối
   */
  updatedAt: Date;
}
