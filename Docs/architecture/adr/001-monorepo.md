# ADR-001: Tổ chức Repository theo mô hình Monorepo

- **Trạng thái:** Đề xuất, chờ nhóm quyết định
- **Ngày:** 24-10-2026
- **Người quyết định:** Nhóm dự án

## 1. Bối cảnh

BrewLite gồm Frontend sử dụng Next.js, Backend sử dụng NestJS và các tài liệu dự án được phát triển phối hợp trong khuôn khổ môn Công nghệ phần mềm.

Việc tổ chức repository cần giúp các thành viên dễ thiết lập môi trường, phối hợp thay đổi API và giao diện, đồng thời quản lý tài liệu thống nhất.

## 2. Đề xuất

Sử dụng một Git repository để quản lý Frontend, Backend và tài liệu, với các thư mục được phân chia rõ ràng.

Cấu trúc dự kiến:

```text
SWE_Project/
├── backend/
├── frontend/
├── Docs/
│   ├── architecture/
│   ├── diagrams/
│   └── requirements/
└── README.md
```

Cấu trúc trên là đề xuất minh họa; cần đối chiếu với cấu trúc repository thực tế.

## 3. Các phương án

1. **Monorepo:** Một repository chứa các thành phần ứng dụng trong những thư mục riêng.
2. **Multi-repo:** Frontend, Backend và tài liệu được quản lý trong các repository riêng biệt.

## 4. Lý do đề xuất

Monorepo có thể đơn giản hóa việc thiết lập môi trường, review thay đổi, quản lý tài liệu và phối hợp các thay đổi liên quan đến API và giao diện.

## 5. Hệ quả

### Lợi ích

- Một repository và quy trình review thống nhất.
- Dễ phối hợp các thay đổi xuyên suốt nhiều thành phần.
- Tài liệu yêu cầu và kiến trúc dễ tìm kiếm.

### Chi phí và rủi ro

- Quyền truy cập repository và quy ước nhánh ảnh hưởng đến toàn nhóm.
- CI có thể cần bộ lọc theo đường dẫn khi dự án phát triển.
- Cần giữ ranh giới rõ ràng giữa công cụ và cấu hình của từng ứng dụng.

## 6. Quy trình Git đề xuất

- Làm việc trên nhánh được phân công.
- Tuân thủ quy ước đặt tên commit của nhóm.
- Tạo Pull Request để review trước khi hợp nhất.
- Cập nhật nhánh theo quy định chung của nhóm.
- Không tự ý viết lại lịch sử hoặc đẩy các commit chưa được kiểm tra.

## 7. Việc cần xác nhận

- [ ] Xác nhận Monorepo phù hợp với quyết định thực tế của nhóm.
- [ ] Xác nhận cấu trúc thư mục chính thức.
- [ ] Xác nhận quy trình nhánh và Pull Request.
- [ ] Cập nhật trạng thái ADR sau khi nhóm quyết định.
