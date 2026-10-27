# Hướng dẫn triển khai hệ thống BrewLite (Task 3.2)

- **Dự án:** BrewLite — Ứng dụng đặt cà phê không dùng tiền mặt
- **Môn học:** Công nghệ Phần mềm, Trường Đại học Sài Gòn
- **Tài liệu thiết kế / sơ đồ:** [`Docs/diagrams/deployment.puml`](diagrams/deployment.puml) · [`Docs/diagrams/deployment.svg`](diagrams/deployment.svg)

---

## Sơ đồ triển khai môi trường Production

![Sơ đồ triển khai Production](diagrams/deployment.svg)

> **Ghi chú:** Các nhà cung cấp dịch vụ đám mây (Render, Railway, Fly.io, Vercel hoặc VPS) trong sơ đồ là ví dụ minh họa cho mô hình triển khai tách biệt giữa Web, API và Database.

---

## 1. Cấu trúc liên kết Runtime (Runtime Topology)

```text
Trình duyệt / PWA (Khách hàng)
    │
    │ HTTPS
    ▼
Dịch vụ Web Next.js / CDN
    │
    │ HTTPS REST (CORS allow-list)
    ▼
Dịch vụ API NestJS (Container :8080)
    │                     \
    │ TLS / Mạng nội bộ 5432\ HTTPS
    ▼                       ▼
PostgreSQL + Persistent Volume   Cổng thanh toán mô phỏng (Mock Payment)
```

- **Dịch vụ Web (Next.js):** Cung cấp giao diện người dùng và tài nguyên tĩnh (static assets). Dịch vụ này tuyệt đối không được phép nhận hoặc lưu trữ thông tin kết nối cơ sở dữ liệu.
- **Dịch vụ API (NestJS):** Chạy ứng dụng backend NestJS. Ứng dụng lắng nghe trên biến môi trường `PORT` (mặc định `:8080`); tầng cân bằng tải / reverse proxy công khai của nền tảng sẽ xử lý HTTPS và chuyển tiếp traffic tới cổng này.
- **Cơ sở dữ liệu (PostgreSQL):** Cơ sở dữ liệu quan hệ được quản lý với bộ lưu trữ bền vững (Persistent Volume), cơ chế tự động sao lưu định kỳ và kết nối mạng nội bộ riêng tư (Private Network).
- **Cổng thanh toán mô phỏng (Mock Payment):** Chỉ được gọi trực tiếp từ tầng Backend API qua HTTPS. Mã nguồn phía Frontend tuyệt đối không lưu trữ khóa bí mật thanh toán.

---

## 2. Phân tách ranh giới các môi trường

| Môi trường | Mục đích sử dụng | Dữ liệu và Quản lý biến môi trường bí mật |
| :--- | :--- | :--- |
| **Local** | Môi trường máy cá nhân của lập trình viên, phục vụ viết mã và kiểm thử thủ công | Tệp `.env` không được đưa lên Git; các dịch vụ kết nối qua `localhost` |
| **CI (Tích hợp liên tục)** | Cài đặt dependencies, chạy linter, kiểm thử tự động và kiểm tra build trên mỗi commit / PR | Chỉ sử dụng kho lưu trữ bí mật của hệ thống CI (GitHub Secrets); không kết nối đến DB Production |
| **Production (Vận hành)** | Phục vụ lưu lượng truy cập thực tế của khách hàng | Secret được quản lý an toàn bởi nhà cung cấp đám mây, bắt buộc HTTPS, cơ sở dữ liệu bền vững và có sao lưu định kỳ |

Tệp `backend/.env.example` trong repository là nguồn tham chiếu chuẩn cho các biến môi trường Backend:

```dotenv
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/brewlite_db
JWT_SECRET=super_secret_jwt_key_example
```

Frontend chỉ nhận các cấu hình công khai không nhạy cảm, ví dụ địa chỉ API endpoint:

```dotenv
NEXT_PUBLIC_API_URL=https://api.brewlite.example.com
```

---

## 3. Cấu hình triển khai Production

### 3.1. Dịch vụ Web (Frontend - Next.js)
1. Cấu hình thư mục gốc (Root Directory) trỏ về: `frontend`.
2. Lệnh cài đặt dependencies: `npm ci`.
3. Lệnh build ứng dụng: `npm run build`.
4. Lệnh khởi chạy: `npm run start`.
5. Thiết lập biến môi trường `NEXT_PUBLIC_API_URL` trỏ đến endpoint HTTPS công khai của NestJS API.
6. Cấu hình tên miền và chứng chỉ HTTPS (SSL/TLS).

### 3.2. Dịch vụ API (Backend - NestJS)
1. Cấu hình thư mục gốc (Root Directory) trỏ về: `backend`.
2. Lệnh cài đặt dependencies: `npm ci`.
3. Lệnh build ứng dụng: `npm run build`.
4. Lệnh khởi chạy: `npm run start:prod`.
5. Đặt biến môi trường `PORT` theo cổng do nhà cung cấp cấp phát (mặc định `8080`).
6. Cấu hình an toàn các biến `DATABASE_URL` và `JWT_SECRET` trong bảng điều khiển bí mật của nền tảng (Secret Store).
7. Thiết lập danh sách CORS cho phép (CORS allow-list) chính xác tên miền của Web Frontend.
8. Cấu hình kiểm tra sức khỏe hệ thống (Health Check) tại endpoint `GET /health`.

### 3.3. Cơ sở dữ liệu (PostgreSQL)
- Khởi tạo PostgreSQL với Persistent Volume để đảm bảo dữ liệu không bị mất khi container khởi động lại.
- Giới hạn quyền truy cập chỉ cho phép các kết nối đến từ Backend API hoặc mạng nội bộ (Private Network).
- Bắt buộc mã hóa đường truyền TLS nếu cơ sở dữ liệu nằm ngoài mạng nội bộ của nhà cung cấp.
- Thực hiện chạy Database Migration như một bước phát hành độc lập trước khi kích hoạt phiên bản code mới.
- Thiết lập sao lưu định kỳ (Automated Backup) và thường xuyên kiểm tra tính khả thi của việc phục hồi dữ liệu.

---

## 4. Mạng và Bảo mật (Networking & Security)

- Toàn bộ lưu lượng Internet công cộng đều phải sử dụng giao thức **HTTPS**. Tự động chuyển hướng hoặc từ chối kết nối HTTP thông thường tại tầng Gateway/Edge.
- Trình duyệt chỉ giao tiếp với Web Service và API Service qua HTTPS; tuyệt đối không mở cổng cơ sở dữ liệu ra Internet công cộng.
- Chỉ cho phép địa chỉ IP của API Service truy cập vào cổng `5432` của PostgreSQL.
- Bảo mật nghiêm ngặt `JWT_SECRET`, `DATABASE_URL` và các khóa thanh toán; không để lộ trong mã nguồn, gói bundle frontend, file ảnh Docker hay log hệ thống.
- Thiết lập CORS chặt chẽ; không dùng wildcard (`*`) cho các yêu cầu có truyền cookie hoặc token xác thực.
- Tự động ẩn (redact) các trường nhạy cảm trong log (Authorization headers, token, mật khẩu, database URL).

---

## 5. Vận hành, Giám sát và Kiểm tra sức khỏe

- Nền tảng hosting phải có cơ chế tự động khởi động lại container (Auto-restart) khi tiến trình API gặp lỗi đột ngột.
- Endpoint Health Check xác nhận API đang phản hồi HTTP bình thường và kết nối Database vẫn hoạt động ổn định.
- Xuất log có cấu trúc chuẩn ra `stdout`/`stderr` để hệ thống thu thập log của nhà cung cấp tự động lưu trữ; bổ sung Request Correlation ID để tiện theo dõi luồng request.
- Thiết lập giám sát các chỉ số vận hành quan trọng: tỷ lệ lỗi HTTP 5xx, độ trễ API (latency), số lần restart, lỗi kết nối DB và các giao dịch thanh toán thất bại.

---

## 6. Quy trình phát hành (Deployment Release Flow)

1. **Kiểm tra tự động trên CI:** Chạy toàn bộ linter (`oxlint`), định dạng (`prettier`), unit test và build thử nghiệm của cả Frontend và Backend.
2. **Áp dụng Migration:** Kiểm tra và chạy các tệp migration cập nhật cơ sở dữ liệu trong bước release được kiểm soát.
3. **Triển khai Backend API:** Triển khai container API mới, kiểm tra endpoint `/health` và theo dõi log khởi động.
4. **Triển khai Web Frontend:** Triển khai Frontend Next.js trỏ đến endpoint API mới đã hoạt động ổn định.
5. **Kiểm thử khói (Smoke Test):** Kiểm tra nhanh các luồng nghiệp vụ cốt lõi: đăng nhập, xem danh sách menu, thêm món vào giỏ hàng, đặt hàng và xem lịch sử đơn.
6. **Phương án dự phòng (Rollback):** Nếu phiên bản mới gặp sự cố nghiêm trọng, nhanh chóng rollback về image/build ổn định trước đó; việc khôi phục cơ sở dữ liệu chỉ thực hiện sau khi đã đánh giá độ an toàn của migration.
