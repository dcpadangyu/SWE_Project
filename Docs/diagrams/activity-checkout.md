# Tài liệu Diễn giải Luồng Hoạt động (Activity Diagram) – BrewLite

## 1. Tổng quan
Sơ đồ `activity-checkout` mô tả luồng nghiệp vụ end-to-end của ứng dụng đặt cà phê không tiền mặt **BrewLite** từ lúc khách hàng mở ứng dụng xem thực đơn cho đến khi thanh toán và nhận đồ uống tại quầy.

### Phân chia làn trách nhiệm (Swimlanes)
Sơ đồ được chia thành 4 làn (swimlanes) tương ứng với các tác nhân và thành phần hệ thống:
1. **Khách hàng (Customer):** Người dùng cuối thực hiện xem menu, chọn tùy chọn đồ uống, quản lý giỏ hàng, đăng nhập, thanh toán không tiền mặt và nhận nước tại quầy.
2. **Next.js UI (Frontend):** Giao diện người dùng (SSR/CSR), quản lý trạng thái giỏ hàng (Zustand/Context), hiển thị trạng thái tải/lỗi và giao tiếp với Backend qua REST API.
3. **NestJS Backend (API & Database):** Xử lý xác thực JWT, kiểm tra dữ liệu đầu vào (`class-validator`), kiểm soát tồn kho đồng thời (Transaction + Optimistic Locking), quản lý máy trạng thái đơn hàng (Order State Machine) và tích hợp cổng thanh toán giả lập (Mock Payment Gateway).
4. **Barista (Nhân viên pha chế):** Tiếp nhận đơn hàng đã thanh toán (`PAID`), thực hiện pha chế và cập nhật tiến độ cho đến khi bàn giao đồ uống cho khách.

---

## 2. Chi tiết các Giai đoạn trong Luồng Nghiệp vụ

### Giai đoạn 1: Xem Menu -> Chọn tùy chọn -> Giỏ hàng
1. **Xem Menu:** Khách hàng mở ứng dụng, Next.js UI gọi `GET /products` đến NestJS Backend để lấy danh sách đồ uống kèm hình ảnh, tên và giá từ cơ sở dữ liệu PostgreSQL và hiển thị dưới dạng lưới.
2. **Chọn tùy chọn (Size & Topping):** Khi khách chọn một món, hệ thống gọi `GET /products/:id` để hiển thị chi tiết. Khách hàng chọn kích cỡ (`S`, `M`, `L`), loại `Topping` và nhấn **Thêm vào giỏ**.
3. **Quản lý Giỏ hàng:** Next.js UI lưu sản phẩm vào state (Zustand/Context), tự động tính lại tổng tiền tạm tính và cập nhật số lượng trên biểu tượng giỏ hàng (badge). Tại nút quyết định (*Decision*), khách hàng có thể quay lại Menu để chọn thêm món khác hoặc nhấn **Thanh toán** để chuyển sang bước đặt đơn.

### Giai đoạn 2: Xác thực Người dùng & Đặt đơn
1. **Kiểm tra đăng nhập (Trường hợp bắt buộc 1 - Chưa đăng nhập):**
   - Trước khi tạo đơn, Next.js UI kiểm tra token JWT của người dùng.
   - **Nhánh Chưa đăng nhập:** Hệ thống điều hướng khách hàng tới màn hình Đăng nhập/Đăng ký. Khách hàng gửi thông tin qua `POST /auth/login` (hoặc `POST /auth/register`). Backend kiểm tra mật khẩu băm (`bcrypt`) và cấp phát JWT trước khi hợp lưu (*Merge*) quay lại luồng đặt đơn.
   - **Nhánh Đã đăng nhập:** Tiếp tục chuyển thẳng tới bước tạo đơn.
2. **Kiểm tra tồn kho (Trường hợp bắt buộc 2 - Hết hàng):**
   - Next.js UI gửi yêu cầu `POST /orders` kèm thông tin giỏ hàng và mã giảm giá (nếu có).
   - NestJS Backend xác thực JWT Guard, kiểm tra dữ liệu bằng `class-validator` và mở một Database Transaction để kiểm tra số lượng tồn kho (`stock`) từ CSDL.
   - **Nhánh Hết hàng (Thất bại):** Nếu số lượng tồn kho không đủ, Backend rollback transaction và trả về mã lỗi `409 Conflict`. Next.js UI giữ nguyên giỏ hàng và thông báo để khách hàng điều chỉnh lại món.
   - **Nhánh Còn hàng (Thành công):** Backend tự động tính lại tổng tiền, áp dụng mã khuyến mãi hợp lệ, khởi tạo đơn hàng ở trạng thái `PENDING` (chưa trừ tồn kho) và trả về mã đơn hàng.

### Giai đoạn 3: Thanh toán Không tiền mặt
1. **Thực hiện thanh toán:** Khách hàng chọn phương thức thanh toán (**Ví điện tử** `E_WALLET` hoặc **Thẻ ngân hàng** `BANK_CARD`) và nhấn **Xác nhận trả**. Next.js UI gọi `POST /payments` kèm theo `Idempotency-Key` để đảm bảo nếu yêu cầu bị lặp lại cũng không bị trừ tiền hoặc tạo giao dịch hai lần.
2. **Xử lý kết quả thanh toán (Trường hợp bắt buộc 3 - Thanh toán thất bại):**
   - **Nhánh Thanh toán thất bại:**
     - NestJS Backend kiểm tra quy tắc chuyển trạng thái (`assertTransition`) và cập nhật đơn hàng từ `PENDING` sang `PAYMENT_FAILED` (không trừ tồn kho, không cộng điểm thưởng).
     - Next.js UI giữ nguyên giỏ hàng và hiển thị thông báo lỗi.
     - Khách hàng có 2 lựa chọn:
       - **Thử lại:** Đơn hàng chuyển từ `PAYMENT_FAILED` về lại `PENDING` để khách thực hiện thanh toán lại (tối đa 3 lần).
       - **Hủy đơn:** Đơn hàng chuyển sang trạng thái kết thúc `CANCELLED` và kết thúc luồng.
   - **Nhánh Thanh toán thành công:**
     - Trong cùng một Database Transaction với **Optimistic Locking** (`version`), hệ thống trừ tồn kho an toàn, chuyển trạng thái đơn hàng từ `PENDING` sang `PAID` và cộng điểm thưởng tích lũy (`loyaltyPoints`) cho tài khoản khách hàng.
     - Next.js UI xóa giỏ hàng và hiển thị màn hình **Xác nhận đơn hàng** (gồm mã đơn và trạng thái `PAID`).

### Giai đoạn 4: Theo dõi Đơn hàng & Pha chế (Barista)
1. **Theo dõi đơn:** Khách hàng theo dõi tiến độ đơn hàng trực tiếp hoặc qua lịch sử đơn (`GET /orders/me`).
2. **Pha chế và Bàn giao (Order State Machine):**
   - **Tiếp nhận:** Barista nhận đơn `PAID` tại quầy -> Hệ thống chuyển trạng thái sang `PREPARING`.
   - **Hoàn tất pha chế:** Barista pha xong đồ uống -> Hệ thống chuyển trạng thái sang `READY` và thông báo mời khách tới quầy lấy nước.
   - **Giao khách:** Khách hàng nhận đồ uống tại quầy -> Barista xác nhận hoàn tất -> Đơn hàng chuyển sang trạng thái kết thúc `COMPLETED`.

---

## 3. Bảng Tóm tắt các Trạng thái Đơn hàng trong Luồng
| Trạng thái | Tác nhân kích hoạt | Mô tả chuyển tiếp |
| :--- | :--- | :--- |
| `PENDING` | Khách hàng / Backend | Đơn hàng vừa được tạo thành công sau khi kiểm tra còn tồn kho, hoặc khi thử lại từ `PAYMENT_FAILED`. |
| `PAYMENT_FAILED` | Mock Payment / Backend | Thanh toán qua Ví/Thẻ gặp lỗi; không trừ kho và giỏ hàng vẫn được giữ nguyên. |
| `CANCELLED` | Khách hàng / Backend | Khách hàng hủy đơn từ trạng thái `PENDING`, `PAYMENT_FAILED` hoặc `PAID` (Trạng thái kết thúc). |
| `PAID` | Mock Payment / Backend | Thanh toán thành công, trừ tồn kho an toàn (Optimistic Locking) và cộng điểm thưởng (`loyaltyPoints`). |
| `PREPARING` | Barista | Barista tại quầy tiếp nhận đơn hàng `PAID` và bắt đầu pha chế. |
| `READY` | Barista | Đồ uống đã pha xong, sẵn sàng để khách nhận tại quầy. |
| `COMPLETED` | Barista | Đã giao đồ uống cho khách hàng (Trạng thái kết thúc). |
