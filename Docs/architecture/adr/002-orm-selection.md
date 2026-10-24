# ADR-002: Lựa chọn lớp truy cập dữ liệu và ORM

- **Trạng thái:** Đã chấp thuận (Accepted)
- **Ngày:** 24-10-2026
- **Người quyết định:** Toàn bộ thành viên nhóm dự án BrewLite

## 1. Bối cảnh

Hệ thống BrewLite sử dụng cơ sở dữ liệu quan hệ **PostgreSQL** với Backend **NestJS** và **TypeScript**. 

Backend cần một lớp truy cập dữ liệu (Data Access Layer / ORM) để:
- Ánh xạ các thực thể nghiệp vụ (Domain Models: User, Product, Order, OrderItem, Payment, Voucher, LoyaltyTransaction).
- Quản lý lược đồ dữ liệu và tự động hóa cơ chế Migration qua các phiên bản.
- Thực thi Transaction an toàn cho quy trình tạo đơn và trừ tồn kho (NFR-10).
- Hỗ trợ kiểm soát đồng thời (Optimistic Locking) khi nhiều khách cùng đặt món cuối cùng.

## 2. Quyết định

Nhóm thống nhất quyết định lựa chọn **Prisma ORM** làm công nghệ truy cập dữ liệu và quản lý migration chính thức cho dự án BrewLite.

## 3. Các phương án đã đánh giá

1. **Prisma ORM (Được chọn):** Mô hình Schema-first, tự động sinh Type-safe Client và công cụ migration mạnh mẽ.
2. **TypeORM (Bị loại):** Mô hình Entity-first với decorator truyền thống của NestJS; tuy nhiên cấu hình migration phức tạp và dễ phát sinh lỗi đồng bộ lược đồ.
3. **Raw SQL / Knex.js (Bị loại):** Kiểm soát truy vấn ở mức thấp nhất nhưng tốn nhiều công sức ánh xạ dữ liệu thủ công, thiếu tính an toàn kiểu dữ liệu và tăng nguy cơ lỗi bảo mật.

## 4. Lý do lựa chọn Prisma

- **Schema khai báo trực quan (`schema.prisma`):** Lược đồ cơ sở dữ liệu được định nghĩa tập trung tại một tệp duy nhất, rõ ràng, dễ đối chiếu trực tiếp với sơ đồ lớp thực thể (Class Diagram) và SRS.
- **Type-safety tuyệt đối:** Prisma Client tự động sinh mã TypeScript từ schema, bảo đảm mọi câu truy vấn đều được kiểm tra kiểu chặt chẽ ngay trong quá trình biên dịch (compile-time), loại bỏ hoàn toàn các lỗi sai tên cột hoặc sai kiểu dữ liệu.
- **Cơ chế Migration tự động và có phiên bản:**
  - Trong môi trường phát triển (Local): Dùng lệnh `npx prisma migrate dev` để tự động tạo và áp dụng các tệp migration SQL có gắn mốc thời gian.
  - Trong môi trường vận hành (CI/Production): Dùng lệnh `npx prisma migrate deploy` để áp dụng tuần tự các migration chưa chạy trước khi ứng dụng khởi động.
  - Mọi lịch sử migration được lưu trữ an toàn trong bảng quản trị `_prisma_migrations`.
- **Hỗ trợ Transaction và Optimistic Locking:**
  - Hỗ trợ phương thức `prisma.$transaction()` giúp gom các thao tác tạo bản ghi `Order`, `OrderItem` và trừ tồn kho `Product` thành một giao dịch duy nhất, tự động Rollback khi có lỗi.
  - Dễ dàng triển khai Optimistic Locking thông qua trường `version` trên bảng `Product` (`prisma.product.update({ where: { id, version }, data: { stock: { decrement: qty }, version: { increment: 1 } } })`).

## 5. Hệ quả

### Lợi ích

- Tăng tốc độ phát triển và giảm thiểu tối đa lỗi runtime liên quan đến database.
- Cơ chế migration minh bạch, dễ dàng kiểm tra và review trên Pull Request.
- Tích hợp mượt mà với NestJS thông qua một `PrismaService` dùng chung.

### Biện pháp kiểm soát

- Bổ sung `prisma` vào `devDependencies` và `@prisma/client` vào `dependencies` của backend.
- Tạo một `PrismaModule` / `PrismaService` kế thừa `PrismaClient` và quản lý vòng đời kết nối (`onModuleInit`, `onModuleDestroy`).
- Cấu hình bước chạy migration tự động trong Dockerfile / quy trình release trước khi gọi lệnh `node dist/main`.
