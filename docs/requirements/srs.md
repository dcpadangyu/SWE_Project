# BrewLite - Đặc tả yêu cầu phần mềm (SRS)

> **Phân đoạn nhiệm vụ 4:** Auth & Orders (Phân đoạn `User` và `Order`)
> **Phụ trách:** Thành viên 4 - Nguyễn Phúc Tài
> **Phiên bản:** `1.0`
> **Trạng thái:** `Hoàn thành bản nháp - Chờ nhóm review`

## 1. Thông tin tài liệu

| Hạng mục | Nội dung |
| :--- | :--- |
| **Tên dự án** | BrewLite - Ứng dụng đặt cà phê không dùng tiền mặt |
| **Môn học** | Công nghệ Phần mềm (Học kỳ I - Năm học 2026–2027) |
| **Phạm vi tài liệu** | Đặc tả yêu cầu chức năng (FR), tiêu chí chấp nhận (AC) và độ ưu tiên MoSCoW cho nhóm **User (Auth)** và **Order (Đơn hàng & Thanh toán)** |
| **File đích trong repo** | `docs/requirements/srs.md` |
| **Công nghệ sử dụng** | Next.js (Frontend), NestJS + Passport JWT + class-validator (Backend), PostgreSQL + Prisma/TypeORM (DB) |

## 2. Phạm vi phân đoạn

Phân đoạn 4 phụ trách các chức năng từ lúc khách hàng chốt giỏ hàng đến khi hoàn tất đơn, bao gồm:
- **Nhóm User (Auth):** Đăng ký tài khoản (`POST /auth/register`), đăng nhập cấp JWT (`POST /auth/login`) và bảo vệ các route đặt hàng bằng JWT Guard (Task 7 - Sprint 2).
- **Nhóm Order & Payment:** Tạo đơn hàng từ giỏ hàng (`POST /orders`), thanh toán không tiền mặt qua cổng giả lập (`POST /payments`), hiển thị màn hình xác nhận đơn, xem lịch sử đơn (`GET /orders/me`) và xử lý các ràng buộc nghiệp vụ ở backend (Task 6, 8, 9, 10 - Sprint 2 & Sprint 3).

*Lưu ý ghép nối:* Các chức năng hiển thị menu, chọn size/topping và thao tác giỏ hàng trên UI (Task 2, 3, 4, 5) thuộc phân đoạn của các thành viên khác và là dữ liệu đầu vào cho bước tạo đơn ở phân đoạn này.

## 3. Tác nhân, thực thể và quy tắc nghiệp vụ

### 3.1. Các tác nhân liên quan (Actors)

| Tác nhân | Vai trò trong phân đoạn Auth & Orders |
| :--- | :--- |
| **Khách hàng (Customer)** | Đăng ký, đăng nhập, gửi giỏ hàng để tạo đơn, chọn phương thức thanh toán (Ví điện tử / Thẻ ngân hàng), nhận mã đơn và xem lại lịch sử đơn đã đặt. |
| **Mock Payment Gateway** | Dịch vụ giả lập xử lý yêu cầu thanh toán Ví/Thẻ từ backend NestJS và trả về kết quả thành công hoặc thất bại. |
| **Nhân viên pha chế (Barista)** | Nhận đơn ở trạng thái `PAID` và cập nhật trạng thái pha chế (`PREPARING` -> `READY` -> `COMPLETED`). Theo đề bài, giao diện riêng cho Barista nằm ngoài phạm vi MVP, chỉ cài đặt logic kiểm tra trạng thái ở backend. |

### 3.2. Thực thể dữ liệu sử dụng (theo mục 12.2 đề bài)

- **User:** `(id, email, passwordHash, loyaltyPoints)`
- **Order:** `(id, userId, status, total, createdAt)`
- **OrderItem:** `(id, orderId, productId, size, qty, lineTotal)`
- **Payment:** `(id, orderId, idempotencyKey, amount, method)`
- **Product (tham chiếu khi tạo đơn):** `(id, name, price, imageUrl, stock)`

### 3.3. Quy tắc nghiệp vụ chung

- **Xác thực & bảo mật:** Email đăng ký phải đúng định dạng và là duy nhất. Mật khẩu bắt buộc băm bằng `bcrypt` trước khi lưu vào cột `passwordHash`. Các API `POST /orders`, `POST /payments`, `GET /orders/me` phải gắn JWT Guard.
- **Tính toán tiền đơn hàng:** Backend tự tính lại `lineTotal` của từng món (theo giá gốc trong DB + phụ phí size/topping + khuyến mãi nếu có) và tổng tiền `total` của đơn, không lấy trực tiếp số tổng tiền do client gửi lên.
- **Luồng trạng thái đơn hàng (Order State Machine):**
  - Luồng thành công: `PENDING` -> `PAID` -> `PREPARING` -> `READY` -> `COMPLETED`.
  - Luồng lỗi / hủy: `PENDING` -> `PAYMENT_FAILED` (cho phép thử thanh toán lại về `PENDING` hoặc hủy sang `CANCELLED`); `PENDING` -> `CANCELLED`; `PAID` -> `CANCELLED`.
  - Trạng thái `COMPLETED` và `CANCELLED` là trạng thái kết thúc. Mọi bước chuyển trạng thái không hợp lệ phải bị hàm `assertTransition` chặn lại và báo lỗi.
- **Xử lý khi thanh toán lỗi:** Nếu thanh toán thất bại, đơn chuyển sang `PAYMENT_FAILED` và **giỏ hàng trên frontend vẫn được giữ nguyên** để khách thử lại.
- **Chống thanh toán trùng (Idempotency):** Request `POST /payments` dùng `Idempotency-Key` để nếu khách bấm đúp hoặc mạng gửi lặp request 2 lần thì hệ thống chỉ tạo 1 giao dịch và không trừ tiền 2 lần.
- **Kiểm soát tồn kho & điểm thưởng:** Khi nhiều khách đặt cùng lúc, dùng transaction kết hợp optimistic locking để số lượng bán không vượt quá `stock`. Sau khi đơn chuyển sang `PAID`, hệ thống cộng điểm thưởng (`loyaltyPoints`) cho tài khoản của khách.

## 4. Yêu cầu chức năng (FR) và Tiêu chí chấp nhận (AC)

### 4.1. Nhóm User (Xác thực tài khoản)

#### FR-AUTH-01 - Đăng ký tài khoản

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Đăng ký tài khoản | Khách hàng tạo tài khoản mới bằng email và mật khẩu để đặt hàng và tích điểm. | Customer | Khách hàng đang ở màn hình đăng ký. | Email đúng định dạng và chưa tồn tại trong DB; mật khẩu tối thiểu 6 ký tự; băm mật khẩu bằng `bcrypt`; không trả `passwordHash` về client. | Must have |

- **Endpoint:** `POST /auth/register`
- **Dữ liệu đầu vào:** `email`, `password` (kiểm tra qua `class-validator`).

**Tiêu chí chấp nhận (Acceptance Criteria):**
- **AC-AUTH-01.1:** Nhập `email` chưa tồn tại và `password` hợp lệ thì tạo mới 1 bản ghi `User` với `loyaltyPoints = 0` và trả mã `201 Created`.
- **AC-AUTH-01.2:** Nhập `email` đã có trong hệ thống thì từ chối tạo mới và trả mã `409 Conflict` (hoặc `400 Bad Request`) kèm thông báo lỗi.
- **AC-AUTH-01.3:** Nhập `email` sai định dạng hoặc để trống `password` thì bị `class-validator` chặn và trả mã `400 Bad Request`.
- **AC-AUTH-01.4:** Mật khẩu lưu trong bảng `User` phải ở dạng hash (`bcrypt`), không lưu plain text.
- **AC-AUTH-01.5:** JSON trả về cho client chỉ gồm thông tin cơ bản (`id`, `email`, `loyaltyPoints`), không chứa `passwordHash`.

#### FR-AUTH-02 - Đăng nhập và xác thực JWT

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Đăng nhập và xác thực JWT | Kiểm tra email, mật khẩu và cấp JWT để gọi các API đặt đơn, thanh toán, xem lịch sử. | Customer | Khách hàng đã có tài khoản trong hệ thống. | Sai email hoặc mật khẩu trả `401`; các route đặt đơn phải kiểm tra token qua Guard; thời gian phản hồi API `< 500ms`. | Must have |

- **Endpoint:** `POST /auth/login`
- **Header sử dụng sau khi đăng nhập:** `Authorization: Bearer <accessToken>`
- **Các route được bảo vệ:** `POST /orders`, `POST /payments`, `GET /orders/me`.

**Tiêu chí chấp nhận (Acceptance Criteria):**
- **AC-AUTH-02.1:** Nhập đúng `email` và `password` thì trả mã `200 OK` kèm `accessToken` (JWT) hợp lệ.
- **AC-AUTH-02.2:** Nhập sai mật khẩu hoặc email không tồn tại thì trả mã `401 Unauthorized`, không cấp token và chỉ báo lỗi chung ("Email hoặc mật khẩu không đúng").
- **AC-AUTH-02.3:** Gọi `POST /orders`, `POST /payments` hoặc `GET /orders/me` khi chưa có token, token sai chữ ký hoặc hết hạn thì bị Guard chặn và trả `401 Unauthorized`.
- **AC-AUTH-02.4:** Backend lấy `userId` trực tiếp từ payload của JWT sau khi xác thực, không nhận `userId` gửi từ body hay query của client.
- **AC-AUTH-02.5:** Nếu khách bấm "Thanh toán" ở giỏ hàng khi chưa đăng nhập, giao diện chuyển sang trang đăng nhập nhưng vẫn giữ nguyên các món đã chọn trong giỏ.

### 4.2. Nhóm Order (Đơn hàng & Thanh toán)

#### FR-ORDER-01 - Tạo đơn hàng từ giỏ hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Tạo đơn hàng | Nhận danh sách món trong giỏ hàng, kiểm tra hợp lệ và lưu đơn mới ở trạng thái `PENDING`. | Customer | Đã đăng nhập (có JWT) và giỏ hàng có ít nhất 1 sản phẩm. | Validate dữ liệu bằng `class-validator`; kiểm tra tồn kho (`stock`); tự tính tổng tiền ở backend; áp dụng mã giảm giá (nếu có). | Must have |

- **Endpoint:** `POST /orders`
- **Dữ liệu đầu vào:** Danh sách `items` (`productId`, `size`, `topping`, `qty`) và mã khuyến mãi (tùy chọn).
- **Kết quả trả về:** Mã đơn (`id`), `status: "PENDING"`, `total`, `createdAt`, danh sách `OrderItem`.

**Tiêu chí chấp nhận (Acceptance Criteria):**
- **AC-ORDER-01.1:** Khi giỏ hàng hợp lệ và các món còn đủ tồn kho, hệ thống tạo bản ghi `Order` ở trạng thái `PENDING` cùng các `OrderItem` tương ứng và trả về mã đơn.
- **AC-ORDER-01.2:** Giỏ hàng rỗng, số lượng `qty <= 0`, `size` khác `S/M/L` hoặc `productId` không tồn tại thì trả mã `400 Bad Request` (hoặc `404 Not Found`).
- **AC-ORDER-01.3:** Backend tự tính `lineTotal` cho từng món và tổng `total` của cả đơn từ giá trong DB (cộng phụ phí size/topping và trừ khuyến mãi hợp lệ).
- **AC-ORDER-01.4:** Khi có nhiều khách đặt cùng một sản phẩm tại cùng thời điểm, backend dùng transaction + optimistic locking để đảm bảo tổng số lượng bán ra không vượt quá `stock` còn lại.
- **AC-ORDER-01.5:** Nếu có bất kỳ món nào trong giỏ bị lỗi hoặc hết hàng khi lưu, toàn bộ transaction được rollback để không tạo ra đơn hàng thiếu món.

#### FR-ORDER-02 - Thanh toán không tiền mặt

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Thanh toán không tiền mặt | Thanh toán đơn hàng bằng Ví điện tử hoặc Thẻ ngân hàng qua Mock Payment Service. | Customer, Mock Payment Gateway | Đơn hàng thuộc user hiện tại và đang ở trạng thái `PENDING` (hoặc thử lại từ `PAYMENT_FAILED`). | Phương thức hợp lệ là Ví điện tử hoặc Thẻ; kiểm tra `Idempotency-Key`; kiểm tra chuyển trạng thái qua `assertTransition`. | Must have |

- **Endpoint:** `POST /payments`
- **Dữ liệu đầu vào:** `orderId`, `method` (Ví điện tử / Thẻ ngân hàng), header/trường `Idempotency-Key`.
- **Trạng thái đơn sau xử lý:** `PAID` nếu thành công, `PAYMENT_FAILED` nếu lỗi.

**Tiêu chí chấp nhận (Acceptance Criteria):**
- **AC-ORDER-02.1:** Khi giỏ hàng có ít nhất 1 sản phẩm, nút "Thanh toán" hiển thị tổng số tiền cần trả và cho phép khách chọn Ví điện tử hoặc Thẻ ngân hàng.
- **AC-ORDER-02.2:** Khi thanh toán thành công, hệ thống lưu bản ghi `Payment`, chuyển trạng thái đơn sang `PAID`, cộng điểm `loyaltyPoints` cho `User` và xóa giỏ hàng trên UI.
- **AC-ORDER-02.3:** Khi Mock Payment báo lỗi, trạng thái đơn chuyển sang `PAYMENT_FAILED`, không cộng điểm thưởng và **giỏ hàng được giữ nguyên** để khách có thể thử lại.
- **AC-ORDER-02.4:** Gửi 2 lần liên tiếp cùng một `Idempotency-Key` cho cùng một yêu cầu thanh toán thì hệ thống chỉ tạo 1 bản ghi `Payment` / 1 đơn và trả về lại kết quả của lần xử lý đầu.
- **AC-ORDER-02.5:** Không cho phép thanh toán đơn hàng của user khác (`403 Forbidden`) hoặc thanh toán lại đơn đã ở trạng thái `PAID` / `COMPLETED` / `CANCELLED` (bị hàm `assertTransition` chặn).

#### FR-ORDER-03 - Hiển thị xác nhận đơn hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Xác nhận đơn hàng | Hiển thị màn hình thông báo kết quả đặt hàng kèm mã đơn và trạng thái sau khi thanh toán. | Customer | Đã nhận phản hồi từ API `POST /payments`. | Mã đơn và trạng thái hiển thị phải khớp với dữ liệu từ backend; nếu thanh toán lỗi phải hiển thị thông báo rõ ràng. | Must have |

- **Màn hình:** Màn hình số (5) Xác nhận trong wireframe đề bài.
- **Thông tin hiển thị:** Mã đơn (ví dụ `#1042`), trạng thái (`PAID`), tổng tiền, lời nhắc tới quầy nhận nước và nút về trang chủ.

**Tiêu chí chấp nhận (Acceptance Criteria):**
- **AC-ORDER-03.1:** Sau khi thanh toán thành công, giao diện chuyển sang màn hình xác nhận hiển thị đúng mã đơn (`#id`) và trạng thái `PAID`.
- **AC-ORDER-03.2:** Có nút điều hướng để khách quay về trang chủ (Menu) hoặc chuyển sang xem lịch sử đơn hàng.
- **AC-ORDER-03.3:** Trường hợp thanh toán thất bại (`PAYMENT_FAILED`), giao diện thông báo lỗi thanh toán và cho phép khách bấm thử lại mà không phải chọn lại món từ đầu.

#### FR-ORDER-04 - Xem lịch sử đơn hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Xem lịch sử đơn hàng | Khách hàng xem lại danh sách các đơn mình đã đặt cùng trạng thái và tổng tiền của từng đơn. | Customer | Khách hàng đã đăng nhập. | Chỉ trả về đơn của user đang đăng nhập; sắp xếp đơn mới nhất lên đầu; giao diện xử lý đủ trạng thái loading, empty và error. | Must have |

- **Endpoint:** `GET /orders/me`
- **Dữ liệu trả về:** Danh sách `Order` (`id`, `status`, `total`, `createdAt`) kèm chi tiết `OrderItem`.

**Tiêu chí chấp nhận (Acceptance Criteria):**
- **AC-ORDER-04.1:** User gửi request có JWT hợp lệ thì nhận được danh sách các đơn hàng thuộc về đúng `userId` của mình, sắp xếp theo `createdAt` từ mới nhất đến cũ nhất.
- **AC-ORDER-04.2:** User chưa có đơn hàng nào thì API trả về mảng rỗng `[]` với mã `200 OK`, giao diện hiển thị trạng thái trống (Empty State).
- **AC-ORDER-04.3:** User chưa đăng nhập gọi API sẽ nhận mã `401 Unauthorized`.
- **AC-ORDER-04.4:** Giao diện hiển thị trạng thái đang tải (Loading State) khi chờ API và hiển thị thông báo lỗi (Error State) nếu kết nối thất bại.

## 5. Bảng ưu tiên MoSCoW

Bảng dưới đây phân loại mức độ ưu tiên cho các yêu cầu thuộc phân đoạn Auth & Orders theo lộ trình 3 Sprint của đề bài:

| Mã FR / Hạng mục | Yêu cầu chức năng | Mức ưu tiên | Sprint & Task | Lý do ưu tiên |
| :--- | :--- | :--- | :--- | :--- |
| `FR-AUTH-01` | Đăng ký tài khoản (`POST /auth/register`, băm mật khẩu `bcrypt`) | **Must have** | Sprint 2 - Task 7 | Cần có tài khoản người dùng trước khi tạo đơn và bảo mật mật khẩu theo yêu cầu đề bài. |
| `FR-AUTH-02` | Đăng nhập cấp JWT (`POST /auth/login`) và gắn Guard bảo vệ route | **Must have** | Sprint 2 - Task 7 | Bước bắt buộc trong luồng nghiệp vụ trước khi thanh toán và giúp định danh người đặt đơn. |
| `FR-ORDER-01` | Tạo đơn hàng ở trạng thái `PENDING` (`POST /orders`) | **Must have** | Sprint 2 - Task 6 | Chuyển dữ liệu giỏ hàng thành đơn hàng trong DB để chuẩn bị thanh toán. |
| `FR-ORDER-02` | Thanh toán không tiền mặt qua Mock Payment (`POST /payments`) | **Must have** | Sprint 3 - Task 8 | Chức năng chính của ứng dụng BrewLite (chuyển đơn sang `PAID` hoặc `PAYMENT_FAILED`). |
| `FR-ORDER-03` | Màn hình xác nhận đơn hàng (hiển thị mã đơn `#id` và trạng thái) | **Must have** | Sprint 3 - Task 9 | Hoàn chỉnh luồng đặt nước để khách có mã đơn đối chiếu khi nhận đồ uống tại quầy. |
| `FR-ORDER-04` | Xem lịch sử đơn hàng cá nhân (`GET /orders/me`) | **Must have** | Sprint 3 - Task 9 | Nằm trong 6 yêu cầu chức năng cốt lõi (Mục 4.1) và danh sách API tối thiểu (Mục 12.1) của đề bài. |
| **Nghiệp vụ nâng cao (Task 10a)** | Máy trạng thái đơn hàng (`assertTransition`), thanh toán Idempotent (`Idempotency-Key`), kiểm soát tồn kho đồng thời (Optimistic Locking) | **Should have** | Sprint 3 - Task 10 | Yêu cầu nghiệp vụ nâng cao ở Sprint cuối để đảm bảo không trừ tiền lặp, không bán vượt tồn kho và có bài test chấm điểm riêng. |
| **Nghiệp vụ nâng cao (Task 10b)** | Áp mã giảm giá (khuyến mãi) và cộng điểm thưởng (`loyaltyPoints`) sau khi đơn `PAID` | **Could have** | Sprint 3 - Task 10 | Tính năng cộng thêm thuộc Task 10, triển khai sau khi luồng đặt đơn và thanh toán cơ bản đã chạy ổn định. |
| **Ngoài phạm vi MVP** | Giao diện riêng cho Barista cập nhật pha chế; tích hợp cổng thanh toán thật (Momo/VNPay thật) | **Won't have** | Ngoài MVP | Mục 3.2 và Mục 6 của đề bài đã nêu rõ phần này nằm ngoài phạm vi MVP của bài tập lớn. |

## 6. Tóm tắt API phân đoạn Auth & Orders

| Method | Endpoint | Xác thực | Chức năng | Request / Header chính | Response thành công | Mã lỗi chính |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Không | Đăng ký tài khoản | Body: `{ email, password }` | `201` - `{ id, email, loyaltyPoints }` | `400`, `409` |
| `POST` | `/auth/login` | Không | Đăng nhập nhận JWT | Body: `{ email, password }` | `200` - `{ accessToken, user }` | `400`, `401` |
| `POST` | `/orders` | Bearer JWT | Tạo đơn hàng `PENDING` | Body: `{ items: [{ productId, size, topping, qty }], promoCode? }` | `201` - `{ id, status: "PENDING", total, createdAt }` | `400`, `401`, `404`, `409` |
| `POST` | `/payments` | Bearer JWT | Thanh toán đơn (Idempotent) | Header: `Idempotency-Key`<br>Body: `{ orderId, method }` | `200` - `{ paymentId, orderId, status: "PAID" \| "PAYMENT_FAILED" }` | `400`, `401`, `403`, `404`, `409` |
| `GET` | `/orders/me` | Bearer JWT | Lấy lịch sử đơn của user | Header: `Authorization: Bearer <token>` | `200` - danh sách `Order` kèm `OrderItem` | `401` |

## 7. Liên kết đề bài và các trường hợp kiểm thử (Test Cases)

### 7.1. Đối chiếu với yêu cầu đề bài

| Yêu cầu trong đề bài | Mã FR trong tài liệu | Task Scrum tương ứng | Nội dung nghiệm thu chính |
| :--- | :--- | :--- | :--- |
| Mục 4.1 (4) - Đăng ký / đăng nhập tài khoản (JWT) | `FR-AUTH-01`, `FR-AUTH-02` | Task 7 (Sprint 2) | Băm mật khẩu `bcrypt`, phát hành JWT, dùng Guard chặn người chưa đăng nhập đặt đơn. |
| Mục 4.1 (5) - Tạo đơn hàng và thanh toán không tiền mặt | `FR-ORDER-01`, `FR-ORDER-02` | Task 6 (Sprint 2), Task 8 (Sprint 3) | Tạo đơn `PENDING`, chọn Ví/Thẻ, chuyển `PAID` hoặc `PAYMENT_FAILED` (giữ lại giỏ hàng khi lỗi). |
| Mục 4.1 (6) - Hiển thị xác nhận đơn và lịch sử đơn | `FR-ORDER-03`, `FR-ORDER-04` | Task 9 (Sprint 3) | Hiển thị mã đơn và trạng thái sau khi trả tiền; API `GET /orders/me` trả đúng đơn của user. |
| Mục 9 - Nghiệp vụ backend nâng cao | `FR-ORDER-01`, `FR-ORDER-02` | Task 10 (Sprint 3) | Có unit/integration test cho 3 kịch bản: chặn chuyển trạng thái sai, gửi lặp `Idempotency-Key`, và đặt hàng đồng thời không vượt tồn kho. |

### 7.2. Danh sách kiểm thử tối thiểu cần viết

| Nhóm chức năng | Các trường hợp kiểm thử (Test cases) |
| :--- | :--- |
| **Đăng ký & Đăng nhập** | Đăng ký thành công (mật khẩu đã hash); đăng ký trùng email (`409`); sai định dạng email (`400`); đăng nhập đúng trả JWT; đăng nhập sai mật khẩu (`401`); gọi API đặt đơn không kèm JWT (`401`). |
| **Tạo đơn & Tồn kho** | Tạo đơn hợp lệ trả trạng thái `PENDING`; giỏ hàng rỗng hoặc `qty <= 0` (`400`); backend tự tính lại `total` khi client gửi sai giá; **2 request đặt cùng lúc khi `stock = 1` chỉ cho phép 1 đơn thành công (Optimistic Locking)**. |
| **Thanh toán & State Machine** | Thanh toán thành công chuyển `PENDING` -> `PAID` và cộng `loyaltyPoints`; thanh toán lỗi chuyển `PAYMENT_FAILED`; **gửi 2 lần cùng `Idempotency-Key` chỉ tạo 1 giao dịch**; **gọi `assertTransition` chuyển trạng thái sai (VD: `PENDING` -> `READY` hoặc `COMPLETED` -> `PAID`) phải ném lỗi**. |
| **Lịch sử đơn hàng** | Lấy đúng danh sách đơn của user hiện tại theo thứ tự mới nhất; trả mảng rỗng `[]` khi user chưa có đơn; không lộ đơn hàng của user khác. |

## 8. Definition of Done (DoD)

Phân đoạn Auth & Orders được tính là hoàn thành khi thỏa mãn các tiêu chí ở Mục 10 của đề bài:
- Code chạy ổn định, không lỗi build, thời gian phản hồi các API `< 500ms` với dữ liệu mẫu.
- Toàn bộ DTO đầu vào của Auth, Order, Payment đều có validate bằng `class-validator`.
- Giao diện xử lý đầy đủ trạng thái đang tải (loading state), danh sách trống (empty state) và báo lỗi cơ bản (giữ nguyên giỏ hàng khi thanh toán thất bại).
- Pass đủ các unit/integration test cho 3 yêu cầu bắt buộc của Task 10 (State Machine, Idempotency, Concurrency tồn kho).
- Có commit Git với message rõ ràng, đã được thành viên trong nhóm review và cập nhật hướng dẫn chạy vào `README.md`.
