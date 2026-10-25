# HƯỚNG DẪN ĐỌC HIỂU CODE VÀ TÍCH HỢP NỀN TẢNG (TASK 1)
> **Dành cho:** Toàn bộ thành viên nhóm dự án BrewLite (TV2, TV3, TV4, TV5, TV6, TV7)  
> **Người biên soạn:** Đặng Ngọc Tuấn (Thành viên 1 - Trưởng nhóm / Phụ trách Task 1: Core Foundation & Shared Layout)  
> **Dự án:** BrewLite — Ứng dụng đặt cà phê không dùng tiền mặt (Agile Scrum - Assignment 2)

---

## 1. MỤC ĐÍCH CỦA TÀI LIỆU NÀY

Trong Sprint 1, Thành viên 1 (Trưởng nhóm) đã hoàn thành **Task 1: Core Foundation & Shared Layout**. Đây là **phần móng kỹ thuật chung** của cả dự án.

Mục tiêu cốt lõi của phần móng này là thực hiện nguyên tắc **"Zero-blocking"**:
1. Cung cấp sẵn toàn bộ kiểu dữ liệu (Types/Interfaces) chuẩn hóa theo Class Diagram để Frontend và Backend không bị lệch dữ liệu.
2. Dựng sẵn khung giao diện chuẩn di động (Mobile-first Layout) để các bạn làm Frontend chỉ việc gắn component của mình vào, không cần tự tạo khung Header/Footer.
3. Cấu hình sẵn các bộ lọc bảo mật, kiểm tra dữ liệu và tiện ích gọi API để các bạn không phải viết đi viết lại mã nguồn lặp thừa.
4. Giúp các thành viên có thể **lập trình độc lập 100%** ngay từ hôm nay.

---

## 2. BẢN ĐỒ CÁC TỆP MÃ NGUỒN ĐÃ TẠO

Các tệp mã nguồn nền tảng được tổ chức rõ ràng trong Monorepo như sau:

```text
SWE_Project/
├── .gitignore                          --> Bảo vệ repository, chặn lộ file rác, cache và file môi trường .env
├── .env.example                        --> Mẫu biến môi trường tổng thể cho toàn bộ dự án
├── docker-compose.yml                  --> Cấu hình chạy đồng thời 3 container: CSDL PostgreSQL 16, Backend NestJS, Frontend Next.js
│
├── backend/
│   ├── .env.example                    --> Biến môi trường mẫu cho Backend (PORT=8080, DATABASE_URL, JWT_SECRET)
│   ├── Dockerfile                      --> Dockerfile đa tầng (Multi-stage build) chạy NestJS production
│   └── src/
│       ├── main.ts                     --> Điểm khởi động Backend: cấu hình CORS, Global ValidationPipe, Global Exception Filter
│       ├── common/
│       │   ├── types/brewlite.ts       --> Hợp đồng kiểu dữ liệu tĩnh: Các Enum và Interfaces dùng chung phía Backend
│       │   ├── utils/pricing.util.ts   --> Hàm tiện ích tính đơn giá chuẩn (calculateItemPrice) phía Backend
│       │   ├── filters/http-exception.filter.ts --> Bộ lọc AllExceptionsFilter bắt mọi lỗi hệ thống, ẩn stack trace bảo mật
│       │   └── entities/base.entity.ts --> Lớp thực thể cơ sở BaseEntity (chứa id, createdAt, updatedAt)
│       └── health/
│           ├── health.controller.ts    --> Endpoint GET /health báo trạng thái sống của API (Liveness probe)
│           ├── health.module.ts        --> Module Health tích hợp vào AppModule
│           └── health.controller.spec.ts--> Bộ kiểm thử tự động (Unit Test) cho Health check (Pass 100%)
│
└── frontend/
    ├── .env.example                    --> Biến môi trường mẫu cho Frontend (NEXT_PUBLIC_API_URL=http://localhost:8080)
    ├── Dockerfile                      --> Dockerfile đa tầng chạy Next.js production
    ├── types/brewlite.ts               --> Hợp đồng kiểu dữ liệu tĩnh: Các Enum và Interfaces dùng chung phía Frontend
    ├── utils/
    │   ├── pricing.ts                  --> Hàm tiện ích tính đơn giá và tổng tiền món theo Size & Topping
    │   └── apiClient.ts                --> Trình gọi API dùng chung (fetch bọc sẵn JWT token từ localStorage)
    ├── components/
    │   ├── Header.tsx                  --> Thanh đầu trang Mobile-first: Logo BrewLite + Giỏ hàng có Cart Badge tự cập nhật
    │   └── BottomNav.tsx               --> Thanh điều hướng 4 tab dưới đáy màn hình bám sát Wireframe Mục 7
    └── app/
        ├── layout.tsx                  --> Khung giao diện gốc (Mobile-first container max-w-md, Header, BottomNav)
        └── page.tsx                    --> Màn hình chính (Home) hiển thị banner và đón nhận danh sách Menu
```

---

## 3. THỨ TỰ ĐỌC HIỂU CODE KHUYẾN NGHỊ

Để hiểu nhanh và bắt tay vào làm việc ngay, các bạn hãy đọc code theo đúng thứ tự 4 bước sau:

### Bước 1: Đọc Hợp đồng dữ liệu chung (Bắt buộc cho cả Frontend & Backend)
- **Tệp cần đọc:** 
  - Frontend: `frontend/types/brewlite.ts`
  - Backend: `backend/src/common/types/brewlite.ts`
- **Mục đích:** Nắm rõ các định nghĩa Enum chuẩn (`OrderStatus`, `PaymentMethod`, `PaymentStatus`, `Size`, `Role`, `VoucherType`) và các cấu trúc dữ liệu (`Product`, `CartItem`, `Order`, `OrderDetail`, `User`, `Payment`, `Voucher`).
- **Ý nghĩa:** Đây là "tiếng nói chung" của cả nhóm. Khi mọi người dùng chung các interface này, lúc ráp Frontend vào Backend sẽ khớp 100% mà không bị lỗi sai tên trường (ví dụ: `productId` thay vì `product_id`).

### Bước 2: Đọc Logic tính giá độc lập (Dành cho TV4, TV5, TV6)
- **Tệp cần đọc:**
  - Frontend: `frontend/utils/pricing.ts`
  - Backend: `backend/src/common/utils/pricing.util.ts`
- **Mục đích:** Xem hàm `calculateItemPrice(basePrice, size, toppings)`.
- **Ý nghĩa:** Quy tắc tính giá đồ uống của quán (Size M phụ thu 5.000đ, Size L phụ thu 10.000đ, Topping cộng dồn) được viết tập trung tại một nơi duy nhất. Các bạn không cần tự viết lại phép cộng trừ nhân chia này.

### Bước 3: Đọc Backend Core (Dành cho thành viên làm Backend: TV2, TV6, TV7)
- **Tệp cần đọc:**
  1. `backend/src/common/entities/base.entity.ts`: Xem cách định nghĩa lớp trừu tượng `BaseEntity` có sẵn 3 trường `id`, `createdAt`, `updatedAt`.
  2. `backend/src/common/filters/http-exception.filter.ts`: Xem cách Backend bắt lỗi và trả về JSON chuẩn `{ statusCode, message, timestamp, path }`.
  3. `backend/src/main.ts`: Xem cách kích hoạt `ValidationPipe` (tự động validate DTO bằng decorator) và CORS.
  4. `backend/src/health/health.controller.ts`: Xem ví dụ mẫu về 1 Controller chuẩn trong NestJS.

### Bước 4: Đọc Frontend Core (Dành cho thành viên làm Frontend: TV3, TV4, TV5, TV7)
- **Tệp cần đọc:**
  1. `frontend/app/layout.tsx`: Xem khung giao diện chuẩn di động (`max-w-md`). Bạn sẽ thấy Header và BottomNav đã được gắn cố định tại đây, nên trang con của bạn không cần nhúng lại.
  2. `frontend/components/Header.tsx` & `frontend/components/BottomNav.tsx`: Xem cách Cart Badge lắng nghe sự kiện `cart_updated` để tự động nhảy số món trong giỏ hàng.
  3. `frontend/utils/apiClient.ts`: Xem cách gọi các hàm `apiClient.get`, `apiClient.post`. Nó đã tự động gắn Token đăng nhập vào Header `Authorization: Bearer <token>`.

---

## 4. ĐỐI CHIẾU VỚI YÊU CẦU CỦA GIÁO VIÊN TRONG ĐỀ BÀI (ASSIGNMENT 2)

Những thành phần trong Task 1 đáp ứng trực tiếp các tiêu chí chấm điểm và yêu cầu kỹ thuật trong tài liệu của giảng viên:

| Mã yêu cầu trong đề tài | Tên yêu cầu / Tiêu chí | Mã nguồn Task 1 đã giải quyết như thế nào? |
| :--- | :--- | :--- |
| **Mục 4.1 & ADR-001** | Cấu trúc Monorepo & Quy chuẩn kho mã | Tổ chức thư mục `backend/`, `frontend/`, `Docs/`, cấu hình `.gitignore` và `.env.example` chuẩn mực. |
| **Task 2.3 & Data Dict** | Sơ đồ lớp miền (Domain Class Diagram) | Toàn bộ Enums và Interfaces trong `types/brewlite.ts` khớp 100% với thuộc tính trong `Docs/diagrams/class-domain.md`. |
| **Mục 7 (Wireframe PDF)** | Giao diện Mobile-first & Thanh điều hướng | `layout.tsx` chuẩn container di động, `Header.tsx` có Logo BrewLite, `BottomNav.tsx` có đủ 4 tab: Thực đơn, Giỏ hàng, Đơn hàng, Tài khoản. |
| **FR-11 & AC-11.1** | Giỏ hàng & Badge số lượng món | `Header.tsx` và `BottomNav.tsx` tích hợp sẵn Cart Badge màu đỏ, tự ẩn khi giỏ rỗng, tự hiện khi có $\ge 1$ món, giới hạn hiển thị `99+`. |
| **NFR-07 & NFR-09** | An toàn thông tin & Che giấu chi tiết lỗi | `AllExceptionsFilter` bắt mọi ngoại lệ未xử lý, trả mã lỗi HTTP chuẩn và ẩn hoàn toàn stack trace khỏi môi trường vận hành. |
| **NFR-08** | Tính toàn vẹn dữ liệu đầu vào | `ValidationPipe` kích hoạt ở `main.ts` với chế độ `whitelist: true, transform: true`, tự loại bỏ các trường lạ không khai báo trong DTO. |
| **Task 3.1 & Task 5.2** | Kiểm tra sức khỏe dịch vụ (Health Check) | Endpoint `GET /health` cung cấp thông tin liveness, uptime, môi trường phục vụ cho bộ giám sát container. Kèm Unit test pass 100%. |

---

## 5. LƯU Ý KHI LÀM VIỆC VỚI GIT

1. **Nhánh làm việc:** Mỗi thành viên làm việc trên nhánh của mình (`TV1`,`TV2`, `TV3`, `TV4`, `TV5`, `TV6`, `TV7`), lấy code mới nhất từ nhánh `main` (hoặc nhánh `TV1` sau khi merge).
2. **Quy ước Commit:** Tuân thủ đúng tiền tố trong `README.md`:
   - `[Feat]: Thêm một tính năng mới (feature).`
   - `[Fix]: Sửa lỗi (bug fix).`
   - `[Docs]: Thay đổi chỉ liên quan đến tài liệu (documentation).`
   - `[Style]: Thay đổi định dạng, khoảng trắng, thiếu dấu chấm phẩy... không làm thay đổi logic code.`
   - `[Refactor]: Tái cấu trúc code (không sửa lỗi cũng không thêm tính năng).`
   - `[Perf]: Cải thiện hiệu năng.`
   - `[Test]: Thêm hoặc sửa test.`
   - `[Chore]: Các việc vặt không sửa source code hay file test (ví dụ cập nhật build task)`

3. **Không chỉnh sửa các file dùng chung nếu chưa thống nhất:** Nếu cần thêm trường mới vào `types/brewlite.ts`, hãy trao đổi với Trưởng nhóm (TV1) để đảm bảo đồng bộ cho cả dự án.

---