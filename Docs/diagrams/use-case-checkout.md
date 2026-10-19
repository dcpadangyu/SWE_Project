# Đặc tả Use Case Chi tiết: Luồng Đặt món & Thanh toán (Checkout Flow)
- **Mã Use Case:** UC-CHECKOUT-01 (Task 1.3)
- **Tên Use Case:** Đặt món và Thanh toán không dùng tiền mặt
- **Phụ trách:** Thành viên 6 (Khoa Trương)
- **Dự án:** BrewLite


## 1. Tác nhân (Actors)
- **Tác nhân chính (Primary Actor):** Khách hàng (Customer) – Người dùng ứng dụng để xem menu, chọn size, topping, kiểm tra giỏ hàng và tiến hành thanh toán trực tuyến.
- **Tác nhân hỗ trợ (Secondary Actor):** Mock Payment Service (Cổng thanh toán mô phỏng Ví điện tử / Thẻ ngân hàng).

---

## 2. Điều kiện kích hoạt (Trigger)
- Khách hàng nhấn nút **"Thanh toán"** tại màn hình giỏ hàng sau khi đã chọn xong các món đồ uống.

---

## 3. Tiền điều kiện (Pre-conditions)
1. Giỏ hàng có ít nhất **01 sản phẩm**.
2. Sản phẩm còn đủ số lượng tồn kho trong cơ sở dữ liệu (`stock > 0`).
3. Khách hàng đã hoàn tất đăng nhập tài khoản và sở hữu Token JWT hợp lệ.

---

## 4. Hậu điều kiện (Post-conditions)
1. Một bản ghi đơn hàng mới được tạo trong bảng `Order` và chuyển sang trạng thái `PAID`.
2. Tồn kho sản phẩm được cập nhật giảm an toàn (sử dụng Transaction và Optimistic Locking).
3. Khách hàng nhận được một **Mã đơn hàng** duy nhất (ví dụ: `#1042`) kèm màn hình xác nhận.
4. Điểm thưởng (Loyalty Points) được tích lũy vào tài khoản của khách hàng.
5. Giỏ hàng hiện tại được dọn trống để chuẩn bị cho lượt đặt tiếp theo.

---

## 5. Luồng sự kiện chính (Happy Path)

| Bước | Tác nhân (Actor) | Phản hồi của Hệ thống (System Response) |
| :---: | :--- | :--- |
| **1** | Khách hàng mở ứng dụng, duyệt menu và chọn một món đồ uống (ví dụ: Cappuccino). | Hệ thống hiển thị giao diện chi tiết món: danh sách size (S/M/L) và topping (Trân châu/Kem) cùng giá bán tương ứng. |
| **2** | Khách hàng chọn size (Size M), chọn topping mong muốn và nhấn **"Thêm vào giỏ"**. | Hệ thống ghi nhận sản phẩm vào state giỏ hàng (Zustand/Context), cập nhật số lượng badge và tự động tính tổng tiền. |
| **3** | Khách hàng mở màn hình Giỏ hàng, kiểm tra lại danh sách món và bấm nút **"Thanh toán"**. | Hệ thống kiểm tra phiên đăng nhập (JWT token hợp lệ) và hiển thị màn hình Thanh toán với tổng tiền chính xác. |
| **4** | Khách hàng chọn phương thức thanh toán không tiền mặt (**Ví điện tử** hoặc **Thẻ ngân hàng**) và bấm **"Xác nhận trả"**. | Frontend gọi API `POST /orders` để tạo đơn ở trạng thái `PENDING`, đồng thời tạo một mã `Idempotency-Key` duy nhất. |
| **5** | *(Hệ thống tự động thực thi)* | Backend NestJS gọi API `POST /payments` gửi yêu cầu thanh toán kèm `Idempotency-Key` sang Cổng thanh toán giả lập (Mock Payment Gateway). |
| **6** | Cổng thanh toán giả lập xác nhận giao dịch thành công. | Backend thực hiện transaction: kiểm tra & trừ tồn kho an toàn, chuyển trạng thái đơn hàng sang `PAID`, cộng điểm tích lũy và phản hồi kết quả về Frontend. |
| **7** | Khách hàng xem màn hình xác nhận đặt hàng thành công. | Giao diện hiển thị: dấu tick thành công, Mã đơn (ví dụ: `#1042`), Trạng thái `PAID`, thông báo *"Mời tới quầy lấy nước"* và nút bấm *"Về trang chủ"*. |

---

## 6. Ngoại lệ & Xử lý rẽ nhánh (Exceptions)
- **E1 - Chưa đăng nhập khi đặt đơn:** Điều hướng người dùng về trang đăng nhập `/login`. Sau khi xác thực JWT thành công, tự động đưa người dùng quay lại giỏ hàng.
- **E2 - Hết hàng khi xác nhận đơn:** Hệ thống ném lỗi không đủ tồn kho và yêu cầu khách hàng điều chỉnh lại giỏ hàng.
- **E3 - Giao dịch thanh toán thất bại:** Đơn hàng chuyển sang trạng thái `PAYMENT_FAILED`, giữ nguyên giỏ hàng để khách hàng có thể thử lại.