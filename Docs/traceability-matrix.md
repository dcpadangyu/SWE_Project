# Ma trận truy vết yêu cầu (Traceability Matrix)

### Quy ước định danh sơ đồ và tài liệu thiết kế

- **UseCase-01:** Sơ đồ use-case tổng quát (`docs/diagrams/usecase-overview.puml`)
- **Activity-01:** Sơ đồ hoạt động luồng đặt món & thanh toán (`docs/diagrams/activity-checkout.puml`)
- **Sequence-01:** Sơ đồ tuần tự luồng checkout trọng tâm (`docs/diagrams/sequence-checkout.puml`)
- **Class-01:** Sơ đồ lớp miền domain model (`docs/diagrams/class-domain.puml`)
- **Deployment-01:** Sơ đồ triển khai production (`docs/diagrams/deployment.puml`)
- **Architecture-01:** Tài liệu thiết kế kiến trúc hệ thống (`docs/architecture/README.md`)

---

### Bảng ma trận truy vết

| Mã yêu cầu | Use-case/User Story                        | Thiết kế/Sơ đồ                     | Code/API                            | Test |
| :--------- | :----------------------------------------- | :--------------------------------- | :---------------------------------- | :--- |
| FR-01      | UC-01 Đăng ký tài khoản                    | UseCase-01, Class-01               | POST /auth/register                 | T01  |
| FR-02      | UC-02 Đăng nhập và xác thực JWT            | UseCase-01, Sequence-01            | POST /auth/login, JwtAuthGuard      | T02  |
| FR-03      | US-01 Xem danh sách đồ uống                | Activity-01, Class-01              | GET /products                       | T03  |
| FR-04      | US-02 Xem chi tiết sản phẩm                | Activity-01, Class-01              | GET /products/:id                   | T04  |
| FR-05      | US-03 Lựa chọn size và topping             | Activity-01, Class-01              | Next.js ProductOptions              | T05  |
| FR-06      | US-04 Thêm sản phẩm vào giỏ hàng           | Activity-01, Class-01              | Zustand CartStore (addItem)         | T06  |
| FR-07      | US-05 Xem giỏ hàng                         | Activity-01, Class-01              | Next.js CartPage                    | T07  |
| FR-08      | US-06 Cập nhật số lượng trong giỏ          | Activity-01, Class-01              | Zustand CartStore (updateQty)       | T08  |
| FR-09      | US-07 Xóa sản phẩm khỏi giỏ hàng           | Activity-01, Class-01              | Zustand CartStore (removeItem)      | T09  |
| FR-10      | US-08 Tự động tính tổng tiền giỏ hàng      | Activity-01, Class-01              | Zustand CartStore (calcTotal)       | T10  |
| FR-11      | US-09 Hiển thị số lượng trên Cart Badge    | Activity-01, Class-01              | Next.js CartBadge                   | T11  |
| FR-12      | UC-03 Đặt hàng từ giỏ hàng                 | Activity-01, Sequence-01, Class-01 | POST /orders                        | T12  |
| FR-13      | UC-04 Thanh toán không tiền mặt            | Sequence-01, Class-01              | POST /payments                      | T13  |
| FR-14      | US-10 Hiển thị xác nhận đơn hàng           | Activity-01, Sequence-01           | Next.js OrderConfirmPage            | T14  |
| FR-15      | US-11 Xem lịch sử đơn hàng                 | UseCase-01, Class-01               | GET /orders/me                      | T15  |
| NFR-01     | NFR-01 Thời gian phản hồi API (< 500ms)    | Deployment-01, Architecture-01     | NestJS Core, PostgreSQL Indexing    | T16  |
| NFR-02     | NFR-02 Khả năng xử lý tải                  | Deployment-01, Architecture-01     | PostgreSQL Connection Pool          | T17  |
| NFR-03     | NFR-03 Xác thực JWT bắt buộc               | Sequence-01, Architecture-01       | JwtStrategy, PassportModule         | T18  |
| NFR-04     | NFR-04 Phân quyền truy cập tài nguyên      | Sequence-01, Architecture-01       | UserOwnershipGuard                  | T19  |
| NFR-05     | NFR-05 Bảo vệ mật khẩu (bcrypt)            | Class-01                           | bcrypt.hash trong AuthService       | T20  |
| NFR-06     | NFR-06 Quản lý biến môi trường bí mật      | Deployment-01                      | ConfigModule, .env.example          | T21  |
| NFR-07     | NFR-07 Kiểm tra dữ liệu đầu vào và lỗi     | Sequence-01                        | ValidationPipe, class-validator DTO | T22  |
| NFR-08     | NFR-08 Phản hồi giao diện (Loading, Error) | Activity-01                        | Next.js UI State Components         | T23  |
| NFR-09     | NFR-09 Xử lý ngoại lệ tập trung            | Sequence-01, Architecture-01       | AllExceptionsFilter                 | T24  |
| NFR-10     | NFR-10 Tính nhất quán dữ liệu đơn hàng     | Sequence-01                        | Database Transaction ($transaction) | T25  |
| NFR-11     | NFR-11 Khôi phục dữ liệu sau sự cố         | Deployment-01                      | Docker Volume (postgres_data)       | T26  |
| NFR-12     | NFR-12 Cấu trúc phân lớp module rõ ràng    | Architecture-01                    | apps/api/src, apps/web/src          | T27  |
| NFR-13     | NFR-13 Tính nhất quán định dạng mã nguồn   | Architecture-01                    | .prettierrc, .oxlintrc.json         | T28  |
| NFR-14     | NFR-14 Kiểm thử chức năng trọng yếu        | Architecture-01                    | Jest Unit, Integration, E2E Test    | T29  |
| NFR-15     | NFR-15 Đóng gói môi trường bằng Docker     | Deployment-01                      | Dockerfile, docker-compose.yml      | T30  |
| NFR-16     | NFR-16 Cấu hình tách biệt theo môi trường  | Deployment-01                      | ConfigService (local vs production) | T31  |
| NFR-17     | NFR-17 Hướng dẫn vận hành hệ thống         | Architecture-01                    | README.md                           | T32  |
| NFR-18     | NFR-18 Tương thích trình duyệt và Mobile   | Deployment-01                      | Next.js PWA, TailwindCSS            | T33  |
| NFR-19     | NFR-19 Luồng thao tác trực quan            | Activity-01                        | Next.js App Router Flow             | T34  |

---

## Rà soát tính nhất quán (Consistency check)

1. Tính nhất quán về thực thể dữ liệu: Các thực thể trong `Class-01` (`class-domain.puml`) bao phủ đầy đủ các thực thể được đặc tả trong SRS: `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`.
2. Tính nhất quán về trạng thái đơn hàng: Máy trạng thái (Order State Machine) trong SRS, `use-case-checkout.md` và `Sequence-01` (`sequence-checkout.puml`) đều thống nhất sử dụng 7 trạng thái chuẩn: `PENDING`, `PAID`, `PREPARING`, `READY`, `COMPLETED`, `PAYMENT_FAILED`, `CANCELLED`.
3. Tính nhất quán về tham số nghiệp vụ: Header `Idempotency-Key` chống thanh toán trùng và cơ chế kiểm soát tồn kho (optimistic locking) trong SRS được phản ánh trực tiếp trong luồng xử lý của sơ đồ tuần tự `Sequence-01`.
