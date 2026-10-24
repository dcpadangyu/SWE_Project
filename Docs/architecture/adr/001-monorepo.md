# ADR-001: Tổ chức Repository theo mô hình Monorepo

- **Trạng thái:** Đã chấp thuận (Accepted)
- **Ngày:** 24-10-2026
- **Người quyết định:** Toàn bộ thành viên nhóm dự án BrewLite

## 1. Bối cảnh

BrewLite gồm Frontend sử dụng Next.js, Backend sử dụng NestJS và các tài liệu dự án được phát triển phối hợp trong khuôn khổ môn Công nghệ phần mềm.

Việc tổ chức repository cần giúp các thành viên dễ thiết lập môi trường, phối hợp thay đổi API và giao diện, đồng thời quản lý tài liệu thống nhất.

## 2. Quyết định

Nhóm thống nhất quyết định sử dụng mô hình **Monorepo** (một Git repository duy nhất) để quản lý toàn bộ mã nguồn Frontend, Backend và tài liệu kỹ thuật, với các thư mục được phân chia ranh giới rõ ràng.

Cấu trúc repository chính thức:

```text
SWE_Project/
├── backend/            # NestJS API Service & PostgreSQL schema
├── frontend/           # Next.js Web App / PWA
├── Docs/               # Toàn bộ tài liệu kỹ thuật dự án
│   ├── architecture/   # Kiến trúc hệ thống và các bản ADR
│   ├── diagrams/       # Các sơ đồ thiết kế UML (PUML, SVG)
│   └── requirements/   # Đặc tả yêu cầu (SRS, Context & Scope)
├── .github/workflows/  # CI/CD pipelines
└── README.md
```

## 3. Các phương án đã đánh giá

1. **Monorepo (Được chọn):** Một repository duy nhất chứa các thành phần trong các thư mục riêng biệt.
2. **Multi-repo (Bị loại):** Tách Frontend, Backend và Docs thành các repository riêng lẻ.

## 4. Lý do lựa chọn

- **Tính đồng bộ cao:** Giúp kiểm soát và đồng bộ các thay đổi giữa API contract (NestJS) và giao diện gọi API (Next.js) trong cùng một Pull Request.
- **Dễ dàng thiết lập môi trường:** Thành viên mới chỉ cần clone 1 repository duy nhất là có thể khởi chạy toàn bộ hệ thống bằng Docker Compose hoặc script chung.
- **Quản lý tài liệu tập trung:** Toàn bộ tài liệu SRS, ADR, Sơ đồ UML luôn đi kèm và phản ánh đúng phiên bản mã nguồn tại từng commit.
- **Tối ưu hóa CI/CD:** Dễ cấu hình pipeline tích hợp và kiểm thử end-to-end trên cùng một workspace.

## 5. Hệ quả

### Lợi ích

- Một repository và quy trình review Pull Request thống nhất.
- Dễ phối hợp các thay đổi xuyên suốt nhiều thành phần.
- Tài liệu yêu cầu và kiến trúc dễ tìm kiếm, không bị lệch pha với code.

### Biện pháp kiểm soát rủi ro

- Thiết lập quy tắc branch protection trên nhánh `main`: Bắt buộc qua Pull Request và có review trước khi merge.
- Cấu hình CI (GitHub Actions) có bộ lọc đường dẫn (`paths: ['backend/**', 'frontend/**']`) để chỉ chạy test/build cho thành phần có thay đổi.
- Độc lập quản lý dependencies giữa `backend/package.json` và `frontend/package.json`.

## 6. Quy trình Git áp dụng

- Mỗi thành viên làm việc trên nhánh phân công tương ứng (ví dụ: `TV1`, `TV2`... hoặc nhánh feature).
- Đặt tên commit rõ ràng theo chuẩn Conventional Commits (ví dụ: `docs:`, `feat:`, `fix:`).
- Mọi thay đổi vào nhánh chính đều phải qua Pull Request và được Lead review, phê duyệt trước khi merge.
- Không tự ý commit trực tiếp lên `main` hoặc `git push --force` gây ảnh hưởng đến thành viên khác.
