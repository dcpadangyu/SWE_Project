# Từ điển dữ liệu và trách nhiệm các lớp — BrewLite

## 1. Quy ước

Quy ước:

- `-`: thuộc tính private.
- `+`: phương thức public.
- `{static}`: phương thức thuộc lớp.
- `[0..1]`: có thể không có giá trị.
- `Decimal`: kiểu số thập phân chính xác dùng cho tiền.
- `DateTime`: thời điểm được lưu theo quy ước múi giờ thống nhất.
- Quan hệ giữa các đối tượng được thể hiện bằng association trong UML; không lặp lại toàn bộ khóa ngoại trong danh sách thuộc tính.
- `toppingOptions` và `selectedToppings` là mảng JSON; mảng rỗng `[]` biểu thị không có topping.
- Giỏ hàng (Cart) không được mô hình hóa thành lớp domain vì theo SRS (FR-06 đến FR-11) và use case, giỏ hàng được giữ ở phía client (state/localStorage). Chỉ khi khách xác nhận thanh toán, nội dung giỏ mới được chuyển thành `Order` và `OrderItem`.

## 2. Mô tả các lớp

### 2.1.1. Lớp User

**Tác dụng:** Lưu thông tin tài khoản, vai trò và số dư điểm thưởng hiện tại của người dùng.

**Mô tả các thuộc tính:**

| STT | Tên thuộc tính   | Kiểu          | Ràng buộc                                   | Ý nghĩa / Ghi chú                                                                      |
| --- | ---------------- | ------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `-id`            | UUID          | Bắt buộc, duy nhất                          | Định danh người dùng.                                                                  |
| 2   | `-email`         | String        | Bắt buộc, duy nhất, đúng định dạng email    | Địa chỉ dùng để đăng nhập.                                                             |
| 3   | `-passwordHash`  | String        | Bắt buộc                                    | Mật khẩu đã được băm; sử dụng bcrypt. Không trả trường này về client hoặc ghi vào log. |
| 4   | `-fullName`      | String [0..1] | Không bắt buộc                              | Họ tên người dùng.                                                                     |
| 5   | `-phoneNumber`   | String        | Bắt buộc                                    | Số điện thoại liên hệ.                                                                 |
| 6   | `-role`          | Role          | Bắt buộc; tài khoản khách mặc định CUSTOMER | Vai trò của tài khoản.                                                                 |
| 7   | `-loyaltyPoints` | Integer       | Bắt buộc, mặc định 0, không âm              | Số dư điểm thưởng hiện tại.                                                            |
| 8   | `-createdAt`     | DateTime      | Bắt buộc                                    | Thời điểm tạo tài khoản.                                                               |
| 9   | `-updatedAt`     | DateTime      | Bắt buộc                                    | Thời điểm cập nhật tài khoản gần nhất.                                                 |

**Danh sách các method chính:**

- `+addLoyaltyPoints(points: Integer): void`: Cộng số điểm được xác định từ một đơn thanh toán thành công vào `loyaltyPoints`. Từ chối số điểm cộng không hợp lệ. Phương thức không tự tính tỷ lệ quy đổi tiền thành điểm.

### 2.1.2. Lớp Product

**Tác dụng:** Lưu thông tin món trên menu, giá theo size, topping được phép chọn và số lượng còn có thể bán.

**Mô tả các thuộc tính:**

| STT | Tên thuộc tính    | Kiểu          | Ràng buộc                      | Ý nghĩa / Ghi chú                                                                                                                                                                                            |
| --- | ----------------- | ------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `-id`             | UUID          | Bắt buộc, duy nhất             | Định danh sản phẩm.                                                                                                                                                                                          |
| 2   | `-name`           | String        | Bắt buộc                       | Tên món hiển thị trên menu.                                                                                                                                                                                  |
| 3   | `-description`    | String [0..1] | Không bắt buộc                 | Mô tả sản phẩm.                                                                                                                                                                                              |
| 4   | `-imageUrl`       | String [0..1] | Không bắt buộc ở mức lưu trữ   | Đường dẫn ảnh. Nếu trống, giao diện dùng ảnh thay thế để vẫn đáp ứng yêu cầu hiển thị hình ảnh.                                                                                                              |
| 5   | `-category`       | String [0..1] | Không bắt buộc                 | Nhóm món, ví dụ cà phê hoặc trà.                                                                                                                                                                             |
| 6   | `-priceS`         | Decimal       | Bắt buộc, không âm             | Giá một ly size S, chưa cộng topping.                                                                                                                                                                        |
| 7   | `-priceM`         | Decimal       | Bắt buộc, không âm             | Giá một ly size M, chưa cộng topping; M là size được chọn mặc định.                                                                                                                                          |
| 8   | `-priceL`         | Decimal       | Bắt buộc, không âm             | Giá một ly size L, chưa cộng topping.                                                                                                                                                                        |
| 9   | `-toppingOptions` | JSON          | Bắt buộc, mặc định `[]`        | Danh sách topping hợp lệ dạng `[{id, name, price, isAvailable}]`; `price` là giá của topping trên một ly. Mỗi `id` duy nhất trong danh sách của Product.                                                     |
| 10  | `-stock`          | Integer       | Bắt buộc, mặc định 0, không âm | Số ly/phần còn có thể bán, dùng chung giữa các size.                                                                                                                                                         |
| 11  | `-isAvailable`    | Boolean       | Bắt buộc, mặc định true        | Sản phẩm có đang được cửa hàng kinh doanh hay không. Chỉ sản phẩm có `isAvailable = true` và `stock > 0` mới được thêm vào giỏ và tạo đơn; khi `stock = 0` giao diện hiển thị "Hết hàng" (SRS FR-03, FR-04). |
| 12  | `-createdAt`      | DateTime      | Bắt buộc                       | Thời điểm tạo sản phẩm.                                                                                                                                                                                      |
| 13  | `-updatedAt`      | DateTime      | Bắt buộc                       | Thời điểm cập nhật gần nhất.                                                                                                                                                                                 |
| 14  | `-version`        | Integer       | Bắt buộc, mặc định 0           | Số phiên bản dùng cho optimistic locking khi trừ tồn kho; tăng 1 sau mỗi lần cập nhật `stock` thành công (SRS AC-12.4, use case E2b).                                                                        |

**Danh sách các method chính:**

- `+getPrice(size: Size, toppingIds: List<String>): Decimal`: Kiểm tra size, topping thuộc sản phẩm và đang được phục vụ; mỗi topping chỉ được chọn một lần (id không trùng). Danh sách rỗng nghĩa là không chọn topping. Trả về `giá size + Σ giá topping`. Từ chối tùy chọn không hợp lệ (SRS AC-05.6). Đây là đơn giá một ly đã gồm topping, dùng làm bản chụp `OrderItem.unitPrice`.

- `+decreaseStock(quantity: Integer): void`: Kiểm tra số ly cần trừ là số nguyên dương và không vượt tồn kho, sau đó giảm `stock` và tăng `version`. Khi không đủ hàng, phát sinh lỗi nghiệp vụ. Chỉ gọi trong bước hoàn tất thanh toán, không gọi khi sửa giỏ hay chỉ tạo Order PENDING. Method này không tự phát hiện xung đột đồng thời; việc kiểm tra `version` (optimistic locking) và transaction thuộc service/repository. Khi xung đột, đơn được xử lý theo use case E2b.

### 2.1.3. Lớp Order

**Tác dụng:** Quản lý thông tin chung, tổng tiền, voucher áp dụng và vòng đời của một đơn hàng.

**Mô tả các thuộc tính:**

| STT | Tên thuộc tính           | Kiểu            | Ràng buộc                               | Ý nghĩa / Ghi chú                                                                                                                                                                                                                                        |
| --- | ------------------------ | --------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `-id`                    | UUID            | Bắt buộc, duy nhất                      | Định danh đơn hàng.                                                                                                                                                                                                                                      |
| 2   | `-orderCode`             | String          | Bắt buộc, duy nhất                      | Mã đơn hiển thị cho khách và quầy; giao diện hiển thị dạng `#orderCode` (ví dụ `#1042`, SRS AC-14.1).                                                                                                                                                    |
| 3   | `-status`                | OrderStatus     | Bắt buộc, mặc định PENDING              | Trạng thái hiện tại của đơn.                                                                                                                                                                                                                             |
| 4   | `-subtotal`              | Decimal         | Bắt buộc, không âm                      | Tổng thành tiền các OrderItem trước giảm giá.                                                                                                                                                                                                            |
| 5   | `-discountAmount`        | Decimal         | Bắt buộc, mặc định 0; từ 0 đến subtotal | Số tiền được giảm thực tế của đơn (use case A1: `discount_amount`).                                                                                                                                                                                      |
| 6   | `-totalAmount`           | Decimal         | Bắt buộc, không âm                      | Số tiền cuối cùng phải thanh toán.                                                                                                                                                                                                                       |
| 7   | `-voucherCode`           | String [0..1]   | Không bắt buộc                          | Bản chụp mã voucher đã áp dụng (use case A1: `voucher_code`). Mỗi đơn áp dụng tối đa 1 voucher.                                                                                                                                                          |
| 8   | `-voucherUsageCountedAt` | DateTime [0..1] | Không bắt buộc                          | Thời điểm lượt sử dụng voucher được ghi nhận (khi đơn chuyển PAID).                                                                                                                                                                                      |
| 9   | `-note`                  | String [0..1]   | Không bắt buộc                          | Ghi chú của khách cho đơn.                                                                                                                                                                                                                               |
| 10  | `-createdAt`             | DateTime        | Bắt buộc                                | Thời điểm tạo đơn; làm mốc tính thời hạn 15 phút của đơn PENDING (use case E4b).                                                                                                                                                                         |
| 11  | `-updatedAt`             | DateTime        | Bắt buộc                                | Thời điểm cập nhật gần nhất.                                                                                                                                                                                                                             |
| 12  | `-checkoutKey`           | String          | Bắt buộc, duy nhất                      | Khóa nhận diện yêu cầu tạo đơn ban đầu (Idempotency-Key tạo ở Bước 4 của use case); gửi lại cùng yêu cầu phải trả về cùng Order theo checkout E4b/E5. Lần thanh toán đầu tiên của đơn dùng cùng giá trị này; không thay đổi khóa khi thử thanh toán lại. |

**Danh sách các method chính:**

- `+applyVoucher(voucher: Voucher, userUsageCount: Integer, now: DateTime): void`: Kiểm tra voucher có áp dụng được với đơn và người dùng hay không. Nếu hợp lệ, gắn Voucher, lưu mã voucher và số tiền giảm, sau đó cập nhật tổng tiền. Mỗi đơn chỉ áp dụng tối đa 1 voucher. Thao tác này chưa ghi nhận lượt sử dụng thành công.
- `+calculateTotal(): Decimal`: Tính lại `subtotal` từ các OrderItem, xác định `totalAmount = subtotal - discountAmount` (không âm), cập nhật các thuộc tính tổng tiền và trả về tổng thanh toán. Backend luôn tự tính lại, không nhận tổng tiền từ client (SRS AC-12.3).

- `+changeStatus(newStatus: OrderStatus): void`: Chỉ chấp nhận các bước chuyển trong state machine. Việc chuyển PAID được service phối hợp với kết quả thanh toán, kiểm tra/trừ kho, điểm và lượt voucher; không chỉ đổi giá trị enum.

### 2.1.4. Lớp OrderItem

**Tác dụng:** Lưu một dòng món trong đơn, bao gồm cấu hình đã chọn, số lượng và giá tại thời điểm đặt.

**Mô tả các thuộc tính:**

| STT | Tên thuộc tính      | Kiểu    | Ràng buộc                                  | Ý nghĩa / Ghi chú                                                                                |
| --- | ------------------- | ------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | `-id`               | UUID    | Bắt buộc, duy nhất                         | Định danh dòng món.                                                                              |
| 2   | `-productName`      | String  | Bắt buộc                                   | Bản chụp tên sản phẩm lúc đặt.                                                                   |
| 3   | `-size`             | Size    | Bắt buộc; mặc định M khi khởi tạo lựa chọn | Size khách đã chọn.                                                                              |
| 4   | `-quantity`         | Integer | Bắt buộc, lớn hơn hoặc bằng 1              | Số ly cùng cấu hình (cùng sản phẩm, size và danh sách topping).                                  |
| 5   | `-selectedToppings` | JSON    | Bắt buộc, mặc định `[]`                    | Bản chụp `[{id, name, price}]` các topping đã chọn trên mỗi ly. Mỗi id xuất hiện tối đa một lần. |
| 6   | `-unitPrice`        | Decimal | Bắt buộc, không âm                         | Bản chụp giá một ly theo size đã bao gồm toàn bộ topping được chọn trên ly đó.                   |
| 7   | `-subtotal`         | Decimal | Bắt buộc, không âm                         | Thành tiền của dòng món, bằng unitPrice nhân quantity.                                           |

**Danh sách các method chính:**

- `+calculateSubtotal(): Decimal`: Tính `subtotal = unitPrice × quantity`, cập nhật subtotal và trả về thành tiền dòng món. Khi tạo dòng, backend xác định `unitPrice = giá size + Σ topping.price` từ dữ liệu hợp lệ của Product rồi lưu bản chụp. Khi tính lại đơn lịch sử, không lấy giá hiện tại của menu thay cho bản chụp.

Ví dụ: hai ly có cùng cấu hình, mỗi ly giá nước 30.000đ và một topping 5.000đ thì unitPrice = 35.000đ và subtotal = 70.000đ, theo SRS AC-10.2 và checkout A2.2.

### 2.1.5. Lớp Payment

**Tác dụng:** Ghi nhận thông tin và kết quả của một lần thử thanh toán cho Order, kể cả việc hoàn tiền khi đơn bị hủy sau khi cổng đã thu tiền.

**Mô tả các thuộc tính:**

| STT | Tên thuộc tính     | Kiểu            | Ràng buộc                           | Ý nghĩa / Ghi chú                                                                                                                                             |
| --- | ------------------ | --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `-id`              | UUID            | Bắt buộc, duy nhất                  | Định danh lần thử thanh toán.                                                                                                                                 |
| 2   | `-attemptNumber`   | Integer         | Bắt buộc; duy nhất trong cùng Order | Số thứ tự lần thử từ 1 đến 3. Nếu lần thứ ba thất bại, Order chuyển CANCELLED; không tạo lần thử thứ tư. Gửi lại cùng khóa không tính là lần thử mới.         |
| 3   | `-idempotencyKey`  | String          | Bắt buộc, duy nhất                  | Nhận diện một lần thử để chống xử lý trùng (SRS AC-13.4). Lần thử đầu dùng cùng giá trị với `Order.checkoutKey`; mỗi lần thử lại dùng khóa mới (use case E3). |
| 4   | `-paymentMethod`   | PaymentMethod   | Bắt buộc                            | Phương thức ví điện tử hoặc thẻ ngân hàng.                                                                                                                    |
| 5   | `-amount`          | Decimal         | Bắt buộc, không âm                  | Số tiền thanh toán; phải khớp tổng tiền đã xác nhận của Order.                                                                                                |
| 6   | `-status`          | PaymentStatus   | Bắt buộc, mặc định PENDING          | Kết quả xử lý của lần thử: PENDING, SUCCESS, FAILED hoặc REFUNDED.                                                                                            |
| 7   | `-transactionCode` | String [0..1]   | Không bắt buộc khi đang xử lý       | Mã tham chiếu do cổng thanh toán cung cấp.                                                                                                                    |
| 8   | `-errorMessage`    | String [0..1]   | Không bắt buộc                      | Lý do thất bại hiển thị cho khách, không chứa dữ liệu nội bộ nhạy cảm.                                                                                        |
| 9   | `-createdAt`       | DateTime        | Bắt buộc                            | Thời điểm bắt đầu lần thử.                                                                                                                                    |
| 10  | `-completedAt`     | DateTime [0..1] | Không bắt buộc khi PENDING          | Thời điểm nhận kết quả cuối cùng.                                                                                                                             |
| 11  | `-errorCode`       | String [0..1]   | Không bắt buộc                      | Mã lỗi do cổng thanh toán trả về khi thất bại (use case E3).                                                                                                  |
| 12  | `-refundedAt`      | DateTime [0..1] | Chỉ có khi REFUNDED                 | Thời điểm hoàn tiền giao dịch (use case E2b).                                                                                                                 |

**Danh sách các Method chính:**

- `+markSucceeded(transactionCode: String, completedAt: DateTime): void`: Ghi nhận kết quả SUCCESS, mã giao dịch và thời điểm hoàn tất. Từ chối kết quả mâu thuẫn với kết quả cuối cùng đã xác nhận.

- `+markFailed(errorCode: String, errorMessage: String, completedAt: DateTime): void`: Ghi nhận kết quả FAILED, mã lỗi, lý do thất bại và thời điểm hoàn tất. Không được ghi đè một giao dịch đã xác nhận SUCCESS thành FAILED.

- `+markRefunded(refundedAt: DateTime): void`: Chỉ áp dụng cho Payment đang SUCCESS và sau khi gateway xác nhận hoàn tiền thành công. Cập nhật status thành REFUNDED và ghi refundedAt. Việc hủy Order chưa tự động đồng nghĩa với hoàn tiền thành công.

### 2.1.6. Lớp Voucher

**Tác dụng:** Lưu voucher giảm giá áp dụng qua mã và các điều kiện sử dụng.

**Mô tả các thuộc tính:**

| STT | Tên thuộc tính       | Kiểu           | Ràng buộc                                                               | Ý nghĩa / Ghi chú                                                                        |
| --- | -------------------- | -------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `-id`                | UUID           | Bắt buộc, duy nhất                                                      | Định danh voucher.                                                                       |
| 2   | `-code`              | String         | Bắt buộc, duy nhất                                                      | Mã khách nhập để áp dụng.                                                                |
| 3   | `-discountType`      | DiscountType   | Bắt buộc                                                                | Giảm theo phần trăm hoặc số tiền cố định.                                                |
| 4   | `-discountValue`     | Decimal        | Bắt buộc; phần trăm lớn hơn 0 và không vượt 100, hoặc số tiền lớn hơn 0 | Giá trị giảm theo loại voucher.                                                          |
| 5   | `-minOrderValue`     | Decimal        | Bắt buộc, mặc định 0, không âm                                          | Giá trị đơn tối thiểu để được áp dụng voucher.                                           |
| 6   | `-maxDiscount`       | Decimal [0..1] | Không bắt buộc; nếu có thì không âm                                     | Mức giảm tối đa đối với voucher phần trăm.                                               |
| 7   | `-usageLimit`        | Integer        | Bắt buộc, lớn hơn hoặc bằng 1                                           | Tổng lượt sử dụng tối đa.                                                                |
| 8   | `-usageLimitPerUser` | Integer [0..1] | Không bắt buộc; nếu có thì lớn hơn hoặc bằng 1                          | Số lượt tối đa của mỗi khách; không có giá trị nghĩa là không giới hạn riêng theo khách. |
| 9   | `-usedCount`         | Integer        | Bắt buộc, mặc định 0; từ 0 đến usageLimit                               | Tổng lượt đã ghi nhận thành công.                                                        |
| 10  | `-startDate`         | DateTime       | Bắt buộc, nhỏ hơn endDate                                               | Thời điểm bắt đầu hiệu lực.                                                              |
| 11  | `-endDate`           | DateTime       | Bắt buộc                                                                | Thời điểm hết hiệu lực.                                                                  |
| 12  | `-isActive`          | Boolean        | Bắt buộc, mặc định true                                                 | Cho phép hoặc tạm ngừng sử dụng voucher.                                                 |

**Danh sách các Method chính:**

- `+isApplicable(subtotal: Decimal, userUsageCount: Integer, now: DateTime): Boolean`: Kiểm tra voucher tồn tại và đang hoạt động, còn trong thời gian hiệu lực, đạt giá trị đơn tối thiểu, còn lượt dùng toàn hệ thống và giới hạn theo khách (use case A1.2). Trả về true khi mọi điều kiện đều đạt.

- `+calculateDiscount(subtotal: Decimal): Decimal`: Tính mức giảm theo discountType và discountValue. Áp dụng maxDiscount khi có quy định, đồng thời bảo đảm mức giảm không vượt subtotal (tổng thanh toán sau giảm tối thiểu bằng 0).

- `+recordUsage(): void`: Tăng usedCount một lượt khi hoàn tất chuyển đơn sang PAID. Service bảo đảm kiểm tra hạn mức và cập nhật lượt dùng, voucherUsageCountedAt trong cùng transaction, không ghi nhận lặp khi nhận lại kết quả thanh toán.

### 2.1.7. Lớp LoyaltyTransaction

**Tác dụng:** Ghi nhận nguồn phát sinh điểm thưởng từ đơn thanh toán thành công, phục vụ kiểm tra và đối chiếu số dư.

**Mô tả các thuộc tính:**

| STT | Tên thuộc tính | Kiểu     | Ràng buộc           | Ý nghĩa / Ghi chú             |
| --- | -------------- | -------- | ------------------- | ----------------------------- |
| 1   | `-id`          | UUID     | Bắt buộc, duy nhất  | Định danh giao dịch điểm.     |
| 2   | `-points`      | Integer  | Bắt buộc, lớn hơn 0 | Số điểm được cộng từ đơn.     |
| 3   | `-createdAt`   | DateTime | Bắt buộc            | Thời điểm tạo giao dịch điểm. |

**Danh sách các Method chính:**

- `+{static} createEarned(user: User, order: Order, points: Integer): LoyaltyTransaction`: Tạo giao dịch cộng điểm gắn với đúng khách và đơn đã PAID. Từ chối số điểm không hợp lệ hoặc User không phải chủ Order. Service/repository bảo đảm mỗi Order có tối đa một giao dịch cộng điểm và ghi giao dịch cùng cập nhật User.loyaltyPoints trong một transaction.

## 3. Các Enum

| Enum          | Giá trị                                                               | Ý nghĩa                                                                                                        |
| ------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Role          | CUSTOMER, BARISTA, ADMIN                                              | Vai trò tài khoản. CUSTOMER là tác nhân chính trong SRS; BARISTA và ADMIN chờ nhóm xác nhận phạm vi (SRS 2.2). |
| Size          | S, M, L                                                               | Kích thước đồ uống; mặc định chọn M.                                                                           |
| OrderStatus   | PENDING, PAID, PREPARING, READY, COMPLETED, PAYMENT_FAILED, CANCELLED | Trạng thái vòng đời đơn hàng.                                                                                  |
| PaymentMethod | E_WALLET, BANK_CARD                                                   | Phương thức thanh toán mô phỏng.                                                                               |
| PaymentStatus | PENDING, SUCCESS, FAILED, REFUNDED                                    | Trạng thái của một lần thử thanh toán; REFUNDED khi giao dịch SUCCESS đã được hoàn tiền.                       |
| DiscountType  | PERCENTAGE, FIXED_AMOUNT                                              | Hình thức tính giảm giá.                                                                                       |
