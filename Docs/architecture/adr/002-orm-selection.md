# ADR-002: Lựa chọn lớp truy cập dữ liệu và ORM

- **Trạng thái:** Đề xuất, đang chờ quyết định
- **Ngày:** 24-10-2026
- **Người quyết định:** Nhóm dự án

## 1. Bối cảnh

BrewLite dự kiến sử dụng PostgreSQL với Backend NestJS và TypeScript.

Việc lựa chọn ORM hoặc lớp truy cập dữ liệu cần cân nhắc các thư viện hiện có, mức độ quen thuộc của nhóm, nhu cầu migration và yêu cầu của môn học.

## 2. Quyết định

**Chưa có quyết định chính thức.**

ADR này chưa khẳng định Prisma, TypeORM hoặc thư viện nào khác đã được lựa chọn.

## 3. Các phương án cần đánh giá

- **Prisma:** Cung cấp mô hình schema, client và quy trình migration.
- **TypeORM:** Sử dụng mô hình Entity/Repository và có khả năng tích hợp với NestJS.
- **SQL-first hoặc phương án khác:** Chỉ lựa chọn nếu phù hợp với yêu cầu và kỹ năng của nhóm.

## 4. Tiêu chí lựa chọn

1. Thư viện đã được cài đặt hoặc cấu hình trong Backend.
2. Mức độ quen thuộc và khả năng bảo trì của nhóm.
3. Quy trình migration và review schema.
4. Khả năng xử lý transaction khi tạo đơn hàng và các bản ghi liên quan.
5. Khả năng kiểm thử và tương thích PostgreSQL.
6. Yêu cầu môn học và chất lượng tài liệu hướng dẫn.

## 5. Hệ quả

Lựa chọn này ảnh hưởng đến định nghĩa schema, migration, mô hình repository, thiết lập kiểm thử và quy trình hướng dẫn thành viên mới.

Việc thay đổi công nghệ ở giai đoạn sau có thể yêu cầu tái cấu trúc mã nguồn và rà soát migration.

## 6. Việc cần thực hiện

- [ ] Kiểm tra `package.json` của Backend.
- [ ] Kiểm tra lockfile và các thư viện đã cài đặt.
- [ ] Kiểm tra cấu hình cơ sở dữ liệu hiện tại.
- [ ] Thảo luận và xác nhận công nghệ được nhóm lựa chọn.
- [ ] Cập nhật ADR bằng quyết định chính thức và lý do lựa chọn.
