# BrewLite - Software Requirements Specification (SRS)

BrewLite

Software Requirements Specification (SRS)

Phân đoạn nhiệm vụ 4 – Auth & Orders

Môn: Công nghệ Phần mềm

Phiên bản: 1.0

Phạm vi: User, Order, Payment và Order History

Người phụ trách: Thành viên 4 – Nguyễn Phúc Tài


## 1. Thông tin tài liệu


## 2. Phạm vi phân đoạn

Phân đoạn nhiệm vụ 4 mô tả các chức năng Auth & Orders của BrewLite: đăng ký, đăng nhập JWT, tạo đơn hàng, thanh toán không tiền mặt, xác nhận đơn và xem lịch sử đơn. Nội dung này được ghép vào tài liệu SRS tổng thể tại các phần User và Order.

Các chức năng menu, chi tiết sản phẩm và giỏ hàng là đầu vào của phân đoạn này; hệ thống phải nhận được giỏ hàng hợp lệ trước khi tạo đơn.


## 3. Actor và quy tắc nghiệp vụ

- Email đăng ký phải đúng định dạng và không được trùng.

- Mật khẩu phải được băm bằng bcrypt, không lưu dạng rõ.

- Route tạo đơn, thanh toán và lịch sử đơn phải được bảo vệ bằng JWT.

- Đơn mới có trạng thái PENDING; thanh toán thành công chuyển PAID.

- Thanh toán lỗi chuyển PAYMENT_FAILED và giữ giỏ hàng để thử lại.

- Tổng tiền phải được backend tính hoặc kiểm tra, không tin tuyệt đối dữ liệu từ client.

- Mỗi đơn phải có mã đơn duy nhất và liên kết đúng với userId.


## 4. Yêu cầu chức năng và Acceptance Criteria


### FR-AUTH-01 – Đăng ký tài khoản

Hệ thống cho phép khách hàng tạo tài khoản bằng email và mật khẩu.

Endpoint đề xuất: POST /auth/register


#### Acceptance Criteria:

- AC-AUTH-01.1: Email và mật khẩu hợp lệ tạo đúng một tài khoản.

- AC-AUTH-01.2: Email đã tồn tại bị từ chối với lỗi 409 và không tạo bản ghi trùng.

- AC-AUTH-01.3: Email sai định dạng hoặc thiếu trường bị từ chối với lỗi validation.

- AC-AUTH-01.4: Mật khẩu được lưu dưới dạng hash, không phải plaintext.

Ưu tiên MoSCoW: Must have


### FR-AUTH-02 – Đăng nhập và xác thực JWT

Hệ thống xác thực email và mật khẩu rồi phát hành JWT cho các request cần đăng nhập.

Endpoint đề xuất: POST /auth/login


#### Acceptance Criteria:

- AC-AUTH-02.1: Thông tin đúng trả JWT có thể gọi route được bảo vệ.

- AC-AUTH-02.2: Thông tin sai trả HTTP 401 và không phát hành token.

- AC-AUTH-02.3: Token thiếu, sai chữ ký hoặc hết hạn bị từ chối.

- AC-AUTH-02.4: Token không chứa mật khẩu hoặc passwordHash.

Ưu tiên MoSCoW: Must have


### FR-ORDER-01 – Tạo đơn hàng

Người dùng đã đăng nhập gửi giỏ hàng để tạo đơn. Backend validate và tính giá hợp lệ.

Endpoint đề xuất: POST /orders


#### Acceptance Criteria:

- AC-ORDER-01.1: JWT hợp lệ và giỏ hàng có item tạo đúng một đơn PENDING.

- AC-ORDER-01.2: Người chưa đăng nhập nhận HTTP 401.

- AC-ORDER-01.3: Giỏ rỗng, qty không hợp lệ hoặc product không tồn tại bị từ chối.

- AC-ORDER-01.4: Total do backend tính khớp với tổng lineTotal.

- AC-ORDER-01.5: Response có mã đơn duy nhất.

Ưu tiên MoSCoW: Must have


### FR-ORDER-02 – Thanh toán không tiền mặt

Người dùng chọn Ví điện tử hoặc Thẻ để thanh toán đơn PENDING qua mock gateway.

Endpoint đề xuất: POST /payments


#### Acceptance Criteria:

- AC-ORDER-02.1: Thanh toán thành công chuyển đơn sang PAID và hiển thị mã đơn.

- AC-ORDER-02.2: Gateway lỗi chuyển đơn PAYMENT_FAILED và giữ giỏ hàng.

- AC-ORDER-02.3: Đơn PAID không thể thanh toán lại trái quy tắc.

- AC-ORDER-02.4: Cùng Idempotency-Key chỉ tạo một kết quả thanh toán.

- AC-ORDER-02.5: Không thể thanh toán orderId thuộc tài khoản khác.

Ưu tiên MoSCoW: Must have


### FR-ORDER-03 – Xác nhận đơn hàng

Sau thanh toán, hệ thống hiển thị mã đơn, trạng thái, tổng tiền và hướng dẫn nhận nước.

Endpoint đề xuất: Response của POST /payments


#### Acceptance Criteria:

- AC-ORDER-03.1: Hiển thị đúng mã đơn và trạng thái PAID.

- AC-ORDER-03.2: Mã trên giao diện khớp với backend.

- AC-ORDER-03.3: Không hiển thị dữ liệu thanh toán nhạy cảm.

Ưu tiên MoSCoW: Must have


### FR-ORDER-04 – Xem lịch sử đơn hàng

Người dùng đã đăng nhập xem các đơn của chính mình, đơn mới nhất đứng trước.

Endpoint đề xuất: GET /orders/me


#### Acceptance Criteria:

- AC-ORDER-04.1: Chỉ trả các đơn thuộc user hiện tại.

- AC-ORDER-04.2: User chưa đăng nhập nhận HTTP 401.

- AC-ORDER-04.3: Không thể dùng userId khác để xem dữ liệu người khác.

- AC-ORDER-04.4: Chưa có đơn trả HTTP 200 với danh sách rỗng.

Ưu tiên MoSCoW: Should have


## 5. Bảng ưu tiên MoSCoW

Could have: lọc lịch sử, refresh token, đổi mật khẩu, hủy đơn trước thanh toán. Won’t have: quản trị user, phân quyền barista và thanh toán thật qua ngân hàng.


## 6. Tóm tắt API


## 7. Liên kết đề bài và kiểm thử tối thiểu

- FR số 4 – Đăng ký/đăng nhập JWT: FR-AUTH-01, FR-AUTH-02.

- FR số 5 – Tạo đơn và thanh toán: FR-ORDER-01, FR-ORDER-02.

- FR số 6 – Xác nhận và lịch sử đơn: FR-ORDER-03, FR-ORDER-04.

- Kiểm thử đăng ký: thành công, email trùng, email sai định dạng.

- Kiểm thử đăng nhập: đúng, sai mật khẩu, thiếu token, token hết hạn.

- Kiểm thử tạo đơn: giỏ hợp lệ, giỏ rỗng, qty sai, product không tồn tại.

- Kiểm thử thanh toán: thành công, thất bại, sai method, khác user, lặp Idempotency-Key.

- Kiểm thử lịch sử: có dữ liệu, rỗng và cách ly dữ liệu giữa hai user.


## 8. Definition of Done

- API có DTO và validation; route được bảo vệ bằng JWT guard.

- Mật khẩu được hash; response không lộ dữ liệu nhạy cảm.

- Có unit/integration test cho đăng ký, đăng nhập, tạo đơn, thanh toán và lịch sử.

- Luồng chạy được: đăng nhập → tạo đơn → thanh toán → xác nhận → xem lịch sử.

- Tài liệu API và hướng dẫn chạy được cập nhật trong README chung.




| Thuộc tính | Giá trị |

| --- | --- |

| Tên hệ thống | BrewLite – ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt |

| Tài liệu | SRS – Phân đoạn Auth & Orders |

| Mục tiêu | Đặc tả yêu cầu chức năng, tiêu chí chấp nhận và mức ưu tiên cho tài khoản người dùng và đơn hàng |

| Công nghệ | Next.js, NestJS, REST/JSON, PostgreSQL, JWT, bcrypt, Mock Payment Gateway |

| Tài liệu tham chiếu | BrewLite-CongNghePhanMem.pdf và phân công công việc của nhóm |




| Actor / thành phần | Vai trò |

| --- | --- |

| Khách hàng chưa đăng nhập | Đăng ký tài khoản; phải đăng nhập trước khi tạo đơn. |

| Khách hàng đã đăng nhập | Đăng nhập, tạo đơn, thanh toán và xem lịch sử đơn của chính mình. |

| Mock Payment Gateway | Mô phỏng thanh toán Ví điện tử hoặc Thẻ. |

| Backend NestJS | Xác thực JWT, kiểm tra dữ liệu, tạo đơn và xử lý thanh toán. |




| Mã | Yêu cầu | Ưu tiên | Lý do |

| --- | --- | --- | --- |

| FR-AUTH-01 | Đăng ký tài khoản | Must have | Tạo danh tính người dùng. |

| FR-AUTH-02 | Đăng nhập JWT | Must have | Bảo vệ đặt hàng và dữ liệu cá nhân. |

| FR-ORDER-01 | Tạo đơn hàng | Must have | Chuyển giỏ hàng thành đơn PENDING. |

| FR-ORDER-02 | Thanh toán không tiền mặt | Must have | Chức năng trung tâm của MVP. |

| FR-ORDER-03 | Xác nhận đơn | Must have | Xác nhận đơn đã được ghi nhận. |

| FR-ORDER-04 | Lịch sử đơn | Should have | Yêu cầu MVP, triển khai sau happy path nếu thiếu thời gian. |




| Method | Endpoint | Auth | Chức năng | Mã phản hồi |

| --- | --- | --- | --- | --- |

| POST | /auth/register | Không | Đăng ký | 201 / 400 / 409 |

| POST | /auth/login | Không | Đăng nhập, trả JWT | 200 / 401 |

| POST | /orders | Bearer JWT | Tạo đơn PENDING | 201 / 400 / 401 / 409 |

| POST | /payments | Bearer JWT | Thanh toán đơn | 200 / 400 / 401 / 409 |

| GET | /orders/me | Bearer JWT | Lịch sử đơn | 200 / 401 |
