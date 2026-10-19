# Software Requirements Specification (SRS) — BrewLite

- **Dự án:** BrewLite — Ứng dụng đặt cà phê không dùng tiền mặt
- **Môn học:** Công nghệ Phần mềm, Trường Đại học Sài Gòn
- **Phương pháp phát triển:** Agile Scrum
- **Phiên bản:** 0.2 (bản tích hợp)
- **Trạng thái:** Draft — cần nhóm rà soát và thống nhất

---

## 1. Giới thiệu

### 1.1. Mục đích
Tài liệu này xác định các yêu cầu chức năng (FR) và phi chức năng (NFR) của BrewLite. Đây là cơ sở để nhóm thiết kế, phát triển, kiểm thử và đánh giá hệ thống. Các yêu cầu cần có mã định danh duy nhất để thuận tiện theo dõi trong backlog và các đợt Scrum.

### 1.2. Phạm vi
BrewLite là ứng dụng đặt cà phê không dùng tiền mặt. Phạm vi nghiệp vụ dự kiến gồm xem menu, xem chi tiết sản phẩm, tùy chỉnh đồ uống, quản lý giỏ hàng, tài khoản người dùng, tạo đơn hàng, thanh toán và xem lịch sử đơn hàng. Phạm vi triển khai cụ thể phụ thuộc các quyết định của nhóm và các task được thống nhất.

### 1.3. Đối tượng đọc tài liệu
- Thành viên phân tích, phát triển và kiểm thử.
- Trưởng nhóm phụ trách review và tích hợp.
- Giảng viên hướng dẫn và đánh giá đồ án.

### 1.4. Thuật ngữ
| Thuật ngữ | Ý nghĩa |
|---|---|
| SRS | Software Requirements Specification — đặc tả yêu cầu phần mềm |
| FR | Functional Requirement — yêu cầu chức năng |
| NFR | Non-Functional Requirement — yêu cầu phi chức năng |
| AC | Acceptance Criteria — tiêu chí chấp nhận |
| JWT | JSON Web Token — định dạng token dùng cho xác thực/ủy quyền |
| Hash mật khẩu | Phép băm một chiều chuyên dụng để lưu mật khẩu an toàn |
| MoSCoW | Must Have, Should Have, Could Have, Won't Have this release |
| API | Application Programming Interface |

---

## 2. Tổng quan hệ thống

### 2.1. Công nghệ dự kiến
- Backend: NestJS, TypeScript.
- Frontend: Next.js, React, TypeScript, TailwindCSS.
- Cơ sở dữ liệu: PostgreSQL, sẽ tích hợp trong task sau.
- Đóng gói môi trường: Docker theo yêu cầu của nhóm.
- Quản lý mã nguồn: Git và GitHub.

### 2.2. Tác nhân và bên liên quan
| Bên liên quan / tác nhân | Mối quan tâm chính |
|---|---|
| Khách hàng | Tìm sản phẩm, tùy chỉnh đồ uống, đặt hàng và thanh toán thuận tiện |
| Nhóm phát triển | Yêu cầu rõ ràng, có thể triển khai và kiểm thử |
| Trưởng nhóm | Theo dõi tiến độ, review và tích hợp thay đổi |
| Giảng viên | Đánh giá quy trình, tài liệu và sản phẩm đồ án |
| Dịch vụ thanh toán bên ngoài (nếu tích hợp) | Xử lý giao dịch và trả kết quả thanh toán |

Vai trò nhân viên/quản trị viên và quyền hạn tương ứng cần được xác nhận trước khi đưa vào phạm vi chính thức.

---

## 3. Yêu cầu chức năng (FR)

> Các yêu cầu chức năng được định danh theo mã `FR-xx` và tiêu chí chấp nhận tương ứng theo mã `AC-xx.y`.

### 3.1. Tài khoản và xác thực (User & Authentication)

#### 3.1.1. FR-01 - Đăng ký tài khoản

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Đăng ký tài khoản | Khách hàng tạo tài khoản mới bằng email và mật khẩu để đặt hàng và tích điểm thưởng. | Customer (Khách hàng) | Khách hàng đang ở màn hình đăng ký. | Email đúng định dạng và chưa tồn tại trong hệ thống; mật khẩu tối thiểu 6 ký tự; băm mật khẩu bằng thuật toán an toàn (`bcrypt`); không trả dữ liệu mật khẩu về client. | Must |

**Acceptance Criteria:**
- **AC-01.1:** Khi khách hàng nhập `email` chưa tồn tại và `password` hợp lệ → hệ thống tạo mới tài khoản với điểm thưởng ban đầu bằng 0 và thông báo đăng ký thành công.
- **AC-01.2:** Khi khách hàng nhập `email` đã có trong hệ thống → hệ thống từ chối tạo mới và hiển thị thông báo lỗi trùng email.
- **AC-01.3:** Khi khách hàng nhập `email` sai định dạng hoặc để trống `password` → hệ thống từ chối và hiển thị thông báo dữ liệu không hợp lệ.
- **AC-01.4:** Mật khẩu lưu trong cơ sở dữ liệu phải ở dạng băm (`bcrypt`), tuyệt đối không lưu dạng plain text.
- **AC-01.5:** Dữ liệu phản hồi cho client sau khi đăng ký chỉ gồm thông tin cơ bản (`id`, `email`, `loyaltyPoints`), không chứa mật khẩu hay thông tin nhạy cảm.

#### 3.1.2. FR-02 - Đăng nhập và xác thực JWT

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Đăng nhập và xác thực JWT | Kiểm tra email, mật khẩu và cấp JWT để bảo vệ và thực hiện các thao tác đặt đơn, thanh toán, xem lịch sử. | Customer (Khách hàng) | Khách hàng đã có tài khoản trong hệ thống. | Sai email hoặc mật khẩu phải từ chối truy cập; các thao tác đặt đơn phải kiểm tra token; thời gian phản hồi API dưới 500ms. | Must |

**Acceptance Criteria:**
- **AC-02.1:** Khi khách hàng nhập đúng `email` và `password` → hệ thống xác thực thành công và cấp mã phiên đăng nhập (JWT token hợp lệ).
- **AC-02.2:** Khi khách hàng nhập sai mật khẩu hoặc email không tồn tại → hệ thống từ chối đăng nhập và chỉ thông báo lỗi chung ("Email hoặc mật khẩu không đúng").
- **AC-02.3:** Khi người dùng thực hiện thao tác tạo đơn, thanh toán hoặc xem lịch sử mà chưa đăng nhập hoặc token hết hạn → hệ thống chặn thao tác và yêu cầu đăng nhập.
- **AC-02.4:** Hệ thống xác định danh tính người dùng trực tiếp từ token hợp lệ, không nhận định danh gửi từ client.
- **AC-02.5:** Khi khách hàng bấm "Thanh toán" tại giỏ hàng khi chưa đăng nhập → hệ thống chuyển hướng sang trang đăng nhập nhưng vẫn duy trì nguyên vẹn các món đã chọn trong giỏ hàng.

---

### 3.2. Menu và sản phẩm (Product & Menu)

#### 3.2.1. FR-03 - Xem danh sách đồ uống

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Xem danh sách đồ uống | Cho phép khách hàng xem danh sách các sản phẩm đồ uống hiện có của cửa hàng, bao gồm hình ảnh, tên và giá bán của từng sản phẩm. | Customer (Khách hàng) | Khách hàng truy cập vào trang Menu của hệ thống. | Danh sách sản phẩm được lấy từ hệ thống thông qua API; nếu không có sản phẩm, hệ thống hiển thị trạng thái danh sách trống; nếu không thể tải dữ liệu, hệ thống hiển thị thông báo lỗi; sản phẩm có số lượng tồn kho bằng 0 phải được hiển thị trạng thái "Hết hàng"; hệ thống không cho phép khách hàng thêm sản phẩm hết hàng vào giỏ. | Must |

**Acceptance Criteria:**
- **AC-03.1:** Khi khách hàng truy cập trang Menu và hệ thống lấy dữ liệu thành công → hệ thống hiển thị danh sách đồ uống dưới dạng lưới sản phẩm.
- **AC-03.2:** Mỗi sản phẩm trong danh sách phải hiển thị đầy đủ tên sản phẩm, hình ảnh và giá bán.
- **AC-03.3:** Khi hệ thống đang tải danh sách sản phẩm → giao diện hiển thị trạng thái Loading.
- **AC-03.4:** Khi danh sách sản phẩm không có dữ liệu → hệ thống hiển thị trạng thái danh sách trống (Empty State).
- **AC-03.5:** Khi xảy ra lỗi trong quá trình tải danh sách sản phẩm → hệ thống hiển thị thông báo lỗi (Error State).
- **AC-03.6:** Khi khách hàng truy cập trang Menu trên thiết bị di động → hệ thống hiển thị danh sách sản phẩm với bố cục phù hợp kích thước màn hình, không gây tràn nội dung theo chiều ngang.
- **AC-03.7:** Khi sản phẩm có stock = 0 → hệ thống hiển thị trạng thái "Hết hàng" đối với sản phẩm tương ứng.

#### 3.2.2. FR-04 - Xem chi tiết sản phẩm

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Xem chi tiết sản phẩm | Cho phép khách hàng xem thông tin chi tiết của một sản phẩm đồ uống, bao gồm tên, hình ảnh và giá bán, trước khi lựa chọn các tùy chọn và thêm vào giỏ hàng. | Customer (Khách hàng) | Khách hàng truy cập vào trang Menu và lựa chọn một sản phẩm cần xem chi tiết. | Sản phẩm được yêu cầu phải tồn tại trong hệ thống; nếu sản phẩm không tồn tại, hệ thống hiển thị thông báo phù hợp; nếu không thể tải thông tin sản phẩm, hệ thống hiển thị thông báo lỗi; khi sản phẩm hết hàng, hệ thống vẫn cho phép khách hàng xem thông tin chi tiết nhưng không cho phép thêm sản phẩm vào giỏ. | Must |

**Acceptance Criteria:**
- **AC-04.1:** Khi khách hàng lựa chọn một sản phẩm từ danh sách Menu → hệ thống điều hướng đến màn hình chi tiết của sản phẩm tương ứng.
- **AC-04.2:** Khi khách hàng truy cập chi tiết một sản phẩm tồn tại và dữ liệu được tải thành công → hệ thống hiển thị thông tin sản phẩm bao gồm tên, hình ảnh và giá bán.
- **AC-04.3:** Khi khách hàng yêu cầu xem chi tiết sản phẩm có ID không tồn tại → hệ thống hiển thị thông báo không tìm thấy sản phẩm.
- **AC-04.4:** Khi hệ thống đang tải thông tin chi tiết sản phẩm → giao diện hiển thị trạng thái Loading.
- **AC-04.5:** Khi xảy ra lỗi trong quá trình tải thông tin chi tiết sản phẩm → hệ thống hiển thị thông báo lỗi (Error State).
- **AC-04.6:** Khi khách hàng xem chi tiết sản phẩm có stock = 0 → hệ thống hiển thị trạng thái "Hết hàng" và vô hiệu hóa chức năng "Thêm vào giỏ hàng".
- **AC-04.7:** Khi sản phẩm có stock > 0 và các tùy chọn hợp lệ → hệ thống cho phép khách hàng thực hiện thao tác thêm vào giỏ hàng.

#### 3.2.3. FR-05 - Lựa chọn size và topping

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Lựa chọn size và topping | Cho phép khách hàng lựa chọn kích thước (S/M/L) và topping cho sản phẩm đồ uống. Hệ thống mặc định chọn size M và tính toán, hiển thị giá dựa trên các tùy chọn được lựa chọn. | Customer (Khách hàng) | Khách hàng đang ở màn hình chi tiết của một sản phẩm tồn tại trong hệ thống. | Size mặc định là M; khách hàng chỉ được chọn một size tại một thời điểm; size và topping phải thuộc các tùy chọn hợp lệ của sản phẩm; hệ thống phải cập nhật giá khi khách hàng thay đổi lựa chọn; các tùy chọn không hợp lệ không được chấp nhận. | Must |

**Acceptance Criteria:**
- **AC-05.1:** Khi khách hàng truy cập màn hình chi tiết sản phẩm → hệ thống hiển thị các tùy chọn kích thước (S/M/L) và topping tương ứng với sản phẩm, đồng thời tự động chọn size M làm mặc định.
- **AC-05.2:** Khi khách hàng lựa chọn một size hợp lệ khác với size hiện tại → hệ thống cập nhật size được chọn và bỏ lựa chọn size trước đó, bảo đảm chỉ có một size được chọn tại một thời điểm.
- **AC-05.3:** Khi khách hàng lựa chọn topping hợp lệ → hệ thống ghi nhận và hiển thị topping được chọn.
- **AC-05.4:** Khi khách hàng truy cập chi tiết sản phẩm với size mặc định M → hệ thống hiển thị giá tương ứng với size M; khi khách hàng lựa chọn size và topping khác → hệ thống tính toán và hiển thị giá tương ứng với các tùy chọn đã chọn.
- **AC-05.5:** Khi khách hàng thay đổi size hoặc topping → hệ thống tự động cập nhật giá sản phẩm theo lựa chọn mới.
- **AC-05.6:** Khi khách hàng thực hiện lựa chọn size hoặc topping không hợp lệ → hệ thống không chấp nhận lựa chọn đó và không áp dụng giá của tùy chọn không hợp lệ.

---

### 3.3. Giỏ hàng (Cart)

#### 3.3.1. FR-06 – Thêm sản phẩm vào giỏ hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Thêm sản phẩm vào giỏ hàng | Cho phép khách hàng thêm sản phẩm đồ uống đã lựa chọn vào giỏ hàng, bao gồm thông tin sản phẩm, size, topping, số lượng và giá tương ứng với các tùy chọn. | Customer (Khách hàng) | Khách hàng đang ở màn hình chi tiết của một sản phẩm tồn tại trong hệ thống và đã thực hiện các lựa chọn cần thiết để thêm vào giỏ hàng. | Sản phẩm phải tồn tại; size và topping được chọn phải hợp lệ; mỗi lần thêm tương ứng 1 đơn vị sản phẩm; các sản phẩm có cùng productId, size và danh sách topping được gộp số lượng; các sản phẩm khác tùy chọn được lưu thành dòng riêng; thông tin không hợp lệ không được chấp nhận; sản phẩm phải còn hàng; tổng số lượng được yêu cầu trong giỏ đối với sản phẩm không được vượt quá lượng tồn kho hiện tại được hệ thống cung cấp. | Must |

**Acceptance Criteria:**
- **AC-06.1:** Khi khách hàng lựa chọn sản phẩm cùng các tùy chọn hợp lệ và nhấn "Thêm vào giỏ hàng" → hệ thống thêm sản phẩm vào giỏ hàng thành công.
- **AC-06.2:** Khi khách hàng thêm một sản phẩm hợp lệ chưa tồn tại trong giỏ hàng với cùng cấu hình → hệ thống tạo một dòng sản phẩm mới có số lượng mặc định là 1.
- **AC-06.3:** Khi sản phẩm được thêm thành công → hệ thống ghi nhận đúng thông tin sản phẩm, size, topping, số lượng và giá tương ứng với các tùy chọn đã chọn.
- **AC-06.4:** Khi khách hàng thêm một sản phẩm có cùng `productId`, `size` và danh sách `toppings` với một sản phẩm đã có trong giỏ hàng → hệ thống gộp vào dòng sản phẩm hiện có và tăng số lượng của dòng đó thêm 1, không tạo dòng mới.
- **AC-06.5:** Khi khách hàng thêm sản phẩm có cùng `productId` nhưng khác `size` hoặc danh sách `toppings` → hệ thống tạo một dòng sản phẩm riêng trong giỏ hàng.
- **AC-06.6:** Khi khách hàng truy cập giỏ hàng sau khi thêm sản phẩm thành công → hệ thống hiển thị sản phẩm vừa được thêm cùng các thông tin đã lựa chọn.
- **AC-06.7:** Khi khách hàng thêm nhiều sản phẩm khác nhau vào giỏ hàng → hệ thống ghi nhận các sản phẩm được thêm mà không làm mất những sản phẩm đã có trước đó.
- **AC-06.8:** Khi thông tin sản phẩm, size hoặc topping không hợp lệ → hệ thống từ chối thao tác thêm sản phẩm và không làm thay đổi dữ liệu giỏ hàng.
- **AC-06.9:** Khi khách hàng thêm sản phẩm thành công và chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → thông tin sản phẩm trong giỏ hàng vẫn được duy trì.
- **AC-06.10:** Khi khách hàng thêm một sản phẩm có `stock = 0` → hệ thống từ chối thao tác và thông báo sản phẩm đã hết hàng.
- **AC-06.11:** Khi khách hàng thêm một sản phẩm vào giỏ hàng → hệ thống tính tổng số lượng của tất cả các dòng có cùng productId, không phân biệt size hoặc topping. Nếu tổng số lượng sau khi thêm vượt quá stock hiện tại → hệ thống từ chối thao tác và hiển thị thông báo số lượng còn lại.
- **AC-06.12:** Khi sản phẩm còn đủ tồn kho và các tùy chọn hợp lệ → hệ thống cho phép thêm sản phẩm vào giỏ hàng theo quy tắc gộp đã quy định tại FR-06.

#### 3.3.2. FR-07 – Xem giỏ hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Xem giỏ hàng | Cho phép khách hàng xem danh sách các sản phẩm đồ uống đã thêm vào giỏ hàng, bao gồm thông tin sản phẩm, size, topping, số lượng, đơn giá, thành tiền và tổng tiền giỏ hàng. | Customer (Khách hàng) | Khách hàng truy cập vào màn hình Giỏ hàng của hệ thống. | Giỏ hàng hiển thị dữ liệu từ trạng thái giỏ hàng hiện tại; các sản phẩm có cùng productId, size và danh sách topping được hiển thị chung một dòng với số lượng tương ứng; các sản phẩm khác cấu hình được hiển thị thành dòng riêng; nếu giỏ hàng không có sản phẩm, hệ thống hiển thị trạng thái giỏ hàng trống. | Must |

**Acceptance Criteria:**
- **AC-07.1:** Khi khách hàng truy cập màn hình Giỏ hàng và giỏ hàng có sản phẩm → hệ thống hiển thị danh sách các sản phẩm đã được thêm vào giỏ hàng.
- **AC-07.2:** Mỗi dòng sản phẩm trong giỏ hàng phải hiển thị thông tin bao gồm tên sản phẩm, hình ảnh, size, topping đã chọn, số lượng, đơn giá và thành tiền tương ứng.
- **AC-07.3:** Khi giỏ hàng chứa các sản phẩm có cùng `productId`, `size` và danh sách `toppings` → hệ thống hiển thị các sản phẩm đó trên cùng một dòng với số lượng đã được gộp.
- **AC-07.4:** Khi giỏ hàng chứa các sản phẩm có cùng `productId` nhưng khác `size` hoặc danh sách `toppings` → hệ thống hiển thị các sản phẩm đó thành những dòng riêng biệt.
- **AC-07.5:** Khi khách hàng truy cập màn hình Giỏ hàng → hệ thống hiển thị tổng tiền hiện tại của các sản phẩm trong giỏ hàng.
- **AC-07.6:** Khi giỏ hàng không có sản phẩm → hệ thống hiển thị trạng thái giỏ hàng trống (Empty State) và không hiển thị sản phẩm không tồn tại trong giỏ.
- **AC-07.7:** Khi khách hàng thêm sản phẩm vào giỏ hàng và sau đó truy cập màn hình Giỏ hàng trong cùng phiên sử dụng ứng dụng → hệ thống hiển thị đầy đủ các sản phẩm đã được thêm cùng thông tin tương ứng.

#### 3.3.3. FR-08 – Cập nhật số lượng sản phẩm trong giỏ hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Cập nhật số lượng sản phẩm trong giỏ hàng | Cho phép khách hàng tăng hoặc giảm số lượng của từng dòng sản phẩm đã thêm vào giỏ hàng. Hệ thống tự động cập nhật thành tiền và tổng tiền giỏ hàng khi số lượng thay đổi. | Customer (Khách hàng) | Khách hàng đang ở màn hình Giỏ hàng và giỏ hàng có ít nhất một sản phẩm. | Sản phẩm cần cập nhật phải tồn tại trong giỏ hàng; số lượng của dòng sản phẩm đang tồn tại phải ≥ 1; khi giảm từ 1 xuống 0, hệ thống xóa dòng sản phẩm đó khỏi giỏ hàng; khi cập nhật một dòng sản phẩm, các dòng khác không bị thay đổi; hệ thống tính lại thành tiền và tổng tiền sau khi cập nhật thành công; khách hàng không được tăng số lượng vượt quá số lượng tồn kho hiện tại; số lượng sản phẩm trong giỏ không trực tiếp làm thay đổi tồn kho thực tế. | Must |

**Acceptance Criteria:**
- **AC-08.1:** Khi khách hàng tăng số lượng của một dòng sản phẩm trong giỏ hàng → hệ thống tăng số lượng của dòng sản phẩm tương ứng thêm 1 đơn vị.
- **AC-08.2:** Khi khách hàng giảm số lượng của một dòng sản phẩm có số lượng lớn hơn 1 → hệ thống giảm số lượng của dòng sản phẩm tương ứng đi 1 đơn vị.
- **AC-08.3:** Khi số lượng của một dòng sản phẩm bằng 1 và khách hàng tiếp tục thực hiện thao tác giảm → hệ thống giảm số lượng về 0 và tự động xóa dòng sản phẩm đó khỏi giỏ hàng.
- **AC-08.4:** Khi số lượng sản phẩm được cập nhật thành công → hệ thống tự động tính lại thành tiền của dòng sản phẩm dựa trên đơn giá và số lượng mới.
- **AC-08.5:** Khi số lượng sản phẩm thay đổi hoặc một dòng sản phẩm bị xóa do số lượng giảm về 0 → hệ thống tự động cập nhật tổng tiền giỏ hàng.
- **AC-08.6:** Khi khách hàng thay đổi số lượng của một dòng sản phẩm → hệ thống chỉ cập nhật dòng sản phẩm được chọn, không làm thay đổi số lượng, size hoặc topping của các dòng sản phẩm khác.
- **AC-08.7:** Khi khách hàng cập nhật số lượng thành công và chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → giỏ hàng vẫn duy trì các thay đổi đã thực hiện.
- **AC-08.8:** Khi khách hàng tăng số lượng sản phẩm nhưng số lượng mới vượt quá `stock` hiện tại → hệ thống từ chối thao tác tăng và hiển thị thông báo số lượng còn lại.
- **AC-08.9:** Khi khách hàng tăng số lượng sản phẩm và số lượng mới không vượt quá `stock` hiện tại → hệ thống cập nhật số lượng thành công và tính lại thành tiền, tổng tiền giỏ hàng.

#### 3.3.4. FR-09 – Xóa sản phẩm khỏi giỏ hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Xóa sản phẩm khỏi giỏ hàng | Cho phép khách hàng xóa một dòng sản phẩm đã thêm vào giỏ hàng mà không cần giảm số lượng từng đơn vị. Hệ thống cập nhật lại danh sách sản phẩm và tổng tiền sau khi xóa. | Customer (Khách hàng) | Khách hàng đang ở màn hình Giỏ hàng và giỏ hàng có ít nhất một sản phẩm. | Dòng sản phẩm cần xóa phải tồn tại trong giỏ hàng; hệ thống xác định đúng dòng sản phẩm dựa trên productId, size và danh sách toppings; khi xóa, toàn bộ số lượng của dòng được loại bỏ; các dòng sản phẩm khác không bị ảnh hưởng; thao tác xóa khỏi giỏ hàng không làm thay đổi tồn kho thực tế. | Must |

**Acceptance Criteria:**
- **AC-09.1:** Khi khách hàng chọn chức năng "Xóa" đối với một dòng sản phẩm trong giỏ hàng → hệ thống xóa dòng sản phẩm tương ứng khỏi giỏ hàng.
- **AC-09.2:** Khi khách hàng xóa một dòng sản phẩm có số lượng lớn hơn 1 → hệ thống xóa toàn bộ số lượng của dòng sản phẩm đó, không chỉ giảm đi 1 đơn vị.
- **AC-09.3:** Khi khách hàng xóa một dòng sản phẩm → hệ thống xác định đúng dòng dựa trên `productId`, `size` và danh sách `toppings`, không xóa các dòng có cùng sản phẩm nhưng khác cấu hình.
- **AC-09.4:** Khi một dòng sản phẩm được xóa thành công → hệ thống cập nhật danh sách giỏ hàng và tự động tính lại tổng tiền dựa trên các sản phẩm còn lại.
- **AC-09.5:** Khi khách hàng xóa một dòng sản phẩm → các dòng sản phẩm khác trong giỏ hàng vẫn giữ nguyên thông tin, số lượng, size và topping đã chọn.
- **AC-09.6:** Khi khách hàng xóa sản phẩm cuối cùng trong giỏ hàng → hệ thống hiển thị trạng thái giỏ hàng trống (Empty State) và tổng tiền bằng 0.
- **AC-09.7:** Khi dòng sản phẩm cần xóa không tồn tại trong giỏ hàng → hệ thống không thực hiện thay đổi đối với các dòng sản phẩm hiện có.
- **AC-09.8:** Khi khách hàng xóa sản phẩm thành công và chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → trạng thái giỏ hàng sau khi xóa vẫn được duy trì.

#### 3.3.5. FR-10 – Tự động tính tổng tiền giỏ hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Tự động tính tổng tiền giỏ hàng | Cho phép hệ thống tự động tính toán và hiển thị thành tiền của từng dòng sản phẩm và tổng tiền giỏ hàng dựa trên đơn giá theo size, topping và số lượng sản phẩm. Tổng tiền được cập nhật khi khách hàng thêm, thay đổi số lượng hoặc xóa sản phẩm khỏi giỏ hàng. | Customer (Khách hàng) | Khách hàng có thể truy cập giỏ hàng; hệ thống có thông tin giá và số lượng của các sản phẩm đang có trong giỏ. | Đơn giá phải tương ứng với size và topping đã chọn; số lượng phải hợp lệ; thành tiền mỗi dòng bằng đơn giá nhân số lượng; tổng tiền giỏ hàng bằng tổng thành tiền của tất cả các dòng sản phẩm; khi giỏ hàng trống, tổng tiền bằng 0. | Must |

**Acceptance Criteria:**
- **AC-10.1:** Khi khách hàng thêm một sản phẩm với size và topping hợp lệ vào giỏ hàng → hệ thống xác định đơn giá của sản phẩm tương ứng với các tùy chọn đã chọn.
- **AC-10.2:** Khi một dòng sản phẩm có đơn giá và số lượng hợp lệ → hệ thống tính thành tiền của dòng sản phẩm bằng đơn giá nhân với số lượng.
- **AC-10.3:** Khi giỏ hàng có một hoặc nhiều dòng sản phẩm → hệ thống tính tổng tiền giỏ hàng bằng tổng thành tiền của tất cả các dòng sản phẩm hiện có.
- **AC-10.4:** Khi khách hàng thêm sản phẩm mới vào giỏ hàng → hệ thống tự động tính lại và hiển thị tổng tiền giỏ hàng sau khi thêm.
- **AC-10.5:** Khi khách hàng thêm sản phẩm trùng `productId`, `size` và danh sách `toppings` với một dòng đã tồn tại → hệ thống tăng số lượng của dòng tương ứng và cập nhật thành tiền, tổng tiền theo số lượng mới.
- **AC-10.6:** Khi khách hàng tăng hoặc giảm số lượng sản phẩm trong giỏ hàng → hệ thống tự động tính lại thành tiền của dòng sản phẩm được cập nhật và tổng tiền giỏ hàng.
- **AC-10.7:** Khi khách hàng xóa một dòng sản phẩm khỏi giỏ hàng hoặc giảm số lượng của dòng đó từ 1 xuống 0 → hệ thống loại bỏ thành tiền của dòng sản phẩm đó khỏi tổng tiền giỏ hàng.
- **AC-10.8:** Khi giỏ hàng không còn sản phẩm → hệ thống hiển thị tổng tiền bằng 0.
- **AC-10.9:** Khi khách hàng xem giỏ hàng sau khi thực hiện các thao tác thêm, cập nhật hoặc xóa sản phẩm → tổng tiền hiển thị phải tương ứng với dữ liệu giỏ hàng hiện tại.

#### 3.3.6. FR-11 – Hiển thị số lượng sản phẩm trên Cart Badge

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc/ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Hiển thị số lượng sản phẩm trên Cart Badge | Cho phép khách hàng theo dõi tổng số lượng sản phẩm hiện có trong giỏ hàng thông qua chỉ số hiển thị trên biểu tượng giỏ hàng (Cart Badge). Hệ thống tự động cập nhật chỉ số khi khách hàng thêm, thay đổi số lượng hoặc xóa sản phẩm khỏi giỏ hàng. | Customer (Khách hàng) | Khách hàng đang sử dụng giao diện hệ thống có hiển thị biểu tượng giỏ hàng. | Cart Badge hiển thị tổng số lượng đơn vị sản phẩm trong giỏ hàng, không phải số dòng sản phẩm; chỉ số phải là số nguyên không âm; khi giỏ hàng thay đổi, chỉ số được cập nhật tương ứng; khi giỏ hàng trống, tổng số lượng bằng 0. | Must |

**Acceptance Criteria:**
- **AC-11.1:** Khi giỏ hàng có ít nhất một sản phẩm → hệ thống hiển thị tổng số lượng sản phẩm hiện có trên Cart Badge.
- **AC-11.2:** Khi giỏ hàng chứa nhiều dòng sản phẩm với số lượng khác nhau → hệ thống tính tổng số lượng bằng tổng `quantity` của tất cả các dòng sản phẩm.
- **AC-11.3:** Khi khách hàng thêm một sản phẩm mới hoặc thêm sản phẩm trùng cấu hình đã tồn tại trong giỏ hàng → hệ thống tự động tăng chỉ số Cart Badge thêm 1.
- **AC-11.4:** Khi khách hàng tăng hoặc giảm số lượng của một dòng sản phẩm → hệ thống tự động cập nhật chỉ số Cart Badge theo tổng số lượng mới.
- **AC-11.5:** Khi khách hàng xóa một dòng sản phẩm khỏi giỏ hàng → hệ thống giảm chỉ số Cart Badge tương ứng với toàn bộ số lượng của dòng sản phẩm bị xóa.
- **AC-11.6:** Khi khách hàng giảm số lượng của dòng sản phẩm từ 1 xuống 0 → hệ thống xóa dòng sản phẩm đó và cập nhật chỉ số Cart Badge tương ứng.
- **AC-11.7:** Khi giỏ hàng không còn sản phẩm → tổng số lượng của Cart Badge bằng 0.
- **AC-11.8:** Khi khách hàng chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → Cart Badge vẫn hiển thị số lượng sản phẩm tương ứng với trạng thái giỏ hàng hiện tại.

---

### 3.4. Đặt hàng và thanh toán (Orders & Payments)

> **Quy tắc luồng trạng thái đơn hàng (Order State Machine):**
> - Luồng thành công: `PENDING` → `PAID` → `PREPARING` → `READY` → `COMPLETED`.
> - Luồng lỗi / hủy: `PENDING` → `PAYMENT_FAILED` (cho phép thử thanh toán lại về `PENDING` hoặc hủy sang `CANCELLED`); `PENDING` → `CANCELLED`; `PAID` → `CANCELLED`.
> - Trạng thái kết thúc: `COMPLETED` và `CANCELLED`. Mọi hành động chuyển trạng thái sai đều bị hệ thống chặn và báo lỗi.

#### 3.4.1. FR-12 - Tạo đơn hàng từ giỏ hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Tạo đơn hàng từ giỏ hàng | Nhận danh sách món trong giỏ hàng, kiểm tra tính hợp lệ và lưu đơn hàng mới ở trạng thái chờ thanh toán (`PENDING`). | Customer (Khách hàng) | Khách hàng đã đăng nhập (có phiên xác thực hợp lệ) và giỏ hàng có ít nhất 1 sản phẩm. | Dữ liệu món phải hợp lệ; sản phẩm phải còn đủ số lượng tồn kho (`stock`); hệ thống tự động tính lại tổng tiền ở backend; áp dụng mã giảm giá nếu hợp lệ. | Must |

**Acceptance Criteria:**
- **AC-12.1:** Khi giỏ hàng hợp lệ và các món còn đủ tồn kho → hệ thống tạo bản ghi đơn hàng mới ở trạng thái `PENDING` cùng các chi tiết món tương ứng và trả về mã đơn hàng.
- **AC-12.2:** Khi giỏ hàng rỗng, số lượng không hợp lệ hoặc sản phẩm không tồn tại → hệ thống từ chối tạo đơn và thông báo lỗi tương ứng.
- **AC-12.3:** Hệ thống tự động tính toán lại thành tiền từng món và tổng tiền đơn hàng dựa trên giá gốc, phụ phí size, topping và khuyến mãi trong cơ sở dữ liệu (không nhận tổng tiền gửi trực tiếp từ client).
- **AC-12.4:** Khi nhiều khách hàng cùng đặt một sản phẩm tại cùng thời điểm → hệ thống kiểm soát đồng thời (optimistic locking) để đảm bảo số lượng bán ra không vượt quá tồn kho còn lại.
- **AC-12.5:** Nếu có bất kỳ món nào trong giỏ bị lỗi hoặc hết hàng khi xử lý → hệ thống hủy toàn bộ giao dịch (rollback) để tránh tạo đơn hàng thiếu món.

#### 3.4.2. FR-13 - Thanh toán không tiền mặt

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Thanh toán không tiền mặt | Cho phép khách hàng thanh toán đơn hàng bằng Ví điện tử hoặc Thẻ ngân hàng qua cổng thanh toán mô phỏng (Mock Payment). | Customer (Khách hàng), Mock Payment Gateway | Đơn hàng thuộc người dùng hiện tại và đang ở trạng thái `PENDING` (hoặc thử lại từ `PAYMENT_FAILED`). | Phương thức hợp lệ gồm Ví điện tử hoặc Thẻ ngân hàng; chống thanh toán trùng qua `Idempotency-Key`; kiểm tra chuyển trạng thái hợp lệ. | Must |

**Acceptance Criteria:**
- **AC-13.1:** Khi giỏ hàng có ít nhất 1 sản phẩm → giao diện hiển thị tổng số tiền cần thanh toán và cho phép khách hàng lựa chọn phương thức thanh toán không tiền mặt (Ví điện tử hoặc Thẻ ngân hàng).
- **AC-13.2:** Khi thanh toán thành công → hệ thống ghi nhận giao dịch, chuyển trạng thái đơn hàng sang `PAID`, cộng điểm thưởng (`loyaltyPoints`) cho khách hàng và dọn trống giỏ hàng trên giao diện.
- **AC-13.3:** Khi cổng thanh toán báo lỗi → hệ thống chuyển trạng thái đơn hàng sang `PAYMENT_FAILED`, không cộng điểm thưởng và **giữ nguyên giỏ hàng** để khách hàng có thể thử lại.
- **AC-13.4:** Khi khách hàng gửi yêu cầu thanh toán trùng lặp (bấm đúp hoặc mạng gửi lặp) kèm cùng một `Idempotency-Key` → hệ thống chỉ thực hiện 1 giao dịch duy nhất, không trừ tiền hai lần.
- **AC-13.5:** Hệ thống không cho phép thanh toán đơn hàng của người dùng khác hoặc thanh toán lại đơn hàng đã ở trạng thái kết thúc (`PAID`, `COMPLETED`, `CANCELLED`).

#### 3.4.3. FR-14 - Hiển thị xác nhận đơn hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Hiển thị xác nhận đơn hàng | Hiển thị màn hình thông báo kết quả đặt hàng kèm mã đơn và trạng thái sau khi hoàn tất thanh toán. | Customer (Khách hàng) | Đã nhận phản hồi từ dịch vụ thanh toán. | Mã đơn và trạng thái hiển thị phải khớp với hệ thống; nếu thanh toán thất bại phải hiển thị thông báo rõ ràng để thử lại. | Must |

**Acceptance Criteria:**
- **AC-14.1:** Khi thanh toán thành công → giao diện chuyển sang màn hình xác nhận hiển thị dấu tick thành công, mã đơn hàng (`#id`), trạng thái `PAID`, tổng tiền và thông báo hướng dẫn nhận đồ uống tại quầy.
- **AC-14.2:** Màn hình xác nhận cung cấp nút điều hướng để khách hàng quay về trang chủ (Menu) hoặc chuyển sang xem lịch sử đơn hàng.
- **AC-14.3:** Khi thanh toán thất bại (`PAYMENT_FAILED`) → giao diện hiển thị thông báo lỗi thanh toán và nút bấm thử lại mà không yêu cầu khách hàng phải chọn lại món từ đầu.

#### 3.4.4. FR-15 - Xem lịch sử đơn hàng

| Tên chức năng | Mô tả | Tác nhân | Điều kiện trước | Ràng buộc / Ngoại lệ | Ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Xem lịch sử đơn hàng | Cho phép khách hàng xem lại danh sách các đơn hàng mình đã đặt cùng trạng thái và tổng tiền của từng đơn. | Customer (Khách hàng) | Khách hàng đã đăng nhập vào hệ thống. | Chỉ hiển thị đơn hàng thuộc về chính người dùng đang đăng nhập; sắp xếp đơn mới nhất lên đầu; xử lý đầy đủ các trạng thái loading, empty và error. | Must |

**Acceptance Criteria:**
- **AC-15.1:** Khi người dùng gửi yêu cầu có xác thực hợp lệ → hệ thống hiển thị danh sách các đơn hàng thuộc về đúng tài khoản của mình, sắp xếp theo thời gian tạo từ mới nhất đến cũ nhất.
- **AC-15.2:** Khi người dùng chưa có đơn hàng nào → hệ thống hiển thị trạng thái danh sách trống (Empty State) với thông báo thân thiện.
- **AC-15.3:** Khi người dùng chưa đăng nhập yêu cầu xem lịch sử đơn → hệ thống từ chối truy cập và yêu cầu đăng nhập.
- **AC-15.4:** Giao diện hiển thị trạng thái đang tải (Loading State) trong khi chờ dữ liệu và hiển thị thông báo lỗi (Error State) nếu kết nối thất bại.

---

## 4. Yêu cầu phi chức năng (NFR)

| Mã | Tên yêu cầu phi chức năng | Mô tả | MoSCoW |
|---|---|---|---|
| NFR-01 | Thời gian phản hồi API | Trong môi trường kiểm thử và tải mục tiêu do nhóm thống nhất, ít nhất 95% yêu cầu đến các API thuộc phạm vi kiểm thử phải có thời gian phản hồi dưới 500 ms. Không tính thời gian chờ do dịch vụ bên ngoài nếu nhóm không kiểm soát được; điều kiện đo phải được ghi lại trong báo cáo kiểm thử. | Must Have |
| NFR-02 | Khả năng xử lý tải | Nhóm phải xác định một kịch bản tải đại diện cho đồ án và kiểm thử các API chính. Báo cáo phải ghi nhận số yêu cầu đồng thời, thời gian phản hồi, tỷ lệ lỗi và cấu hình môi trường. | Should Have |
| NFR-03 | Xác thực | Các API yêu cầu đăng nhập phải xác minh thông tin xác thực trước khi xử lý yêu cầu. Nếu dùng JWT, backend phải kiểm tra chữ ký và thời hạn token; token không hợp lệ hoặc hết hạn phải bị từ chối. | Must Have |
| NFR-04 | Phân quyền | Backend phải kiểm tra quyền truy cập cho các thao tác/tài nguyên được bảo vệ. Khác với frontend chỉ ẩn nút hoặc chặn trang, backend phải thực thi kiểm tra quyền ở mức API. | Must Have |
| NFR-05 | Bảo vệ mật khẩu | Mật khẩu phải được băm bằng thuật toán chuyên dụng cho mật khẩu, chẳng hạn Argon2id hoặc bcrypt, trước khi lưu. Không lưu mật khẩu dạng văn bản thuần và không ghi mật khẩu vào log. | Must Have |
| NFR-06 | Quản lý bí mật | Khóa JWT, mật khẩu cơ sở dữ liệu và thông tin xác thực khác phải được cung cấp qua biến môi trường hoặc cơ chế quản lý bí mật phù hợp. Không commit giá trị bí mật thực vào Git; file `.env.example` chỉ chứa giá trị mẫu không nhạy cảm. | Must Have |
| NFR-07 | Kiểm tra dữ liệu đầu vào và lỗi | Backend phải xác thực dữ liệu đầu vào của API, từ chối dữ liệu sai định dạng/không hợp lệ và không trả về stack trace, khóa bí mật hoặc thông tin nội bộ nhạy cảm cho người dùng. | Must Have |
| NFR-08 | Phản hồi giao diện | Giao diện cần thể hiện trạng thái đang xử lý, thành công và lỗi cho các thao tác chính, đồng thời cung cấp thông báo dễ hiểu để người dùng biết bước tiếp theo. | Should Have |
| NFR-09 | Xử lý lỗi | Các lỗi dự kiến từ API hoặc dịch vụ phụ thuộc phải được xử lý bằng phản hồi phù hợp. Một yêu cầu lỗi không được làm dừng toàn bộ ứng dụng; chi tiết nội bộ chỉ được ghi log ở nơi phù hợp. | Must Have |
| NFR-10 | Tính nhất quán đơn hàng | Khi cơ sở dữ liệu được tích hợp, thao tác cập nhật nhiều bản ghi có liên quan đến việc tạo đơn phải sử dụng transaction khi phù hợp để tránh trạng thái dữ liệu dở dang. | Must Have |
| NFR-11 | Khôi phục sau sự cố | Nhóm phải ghi rõ cách khởi động lại các dịch vụ sau sự cố. Khi có lưu dữ liệu đơn hàng, cần kiểm tra dữ liệu đã xác nhận vẫn được giữ theo cấu hình lưu trữ và phục hồi đã chọn. | Should Have |
| NFR-12 | Cấu trúc module | Mã nguồn cần được tổ chức theo trách nhiệm rõ ràng, hạn chế trộn logic nghiệp vụ, xử lý API và giao diện trong cùng một thành phần không cần thiết. | Should Have |
| NFR-13 | Tính nhất quán mã nguồn | Nhóm phải tuân theo quy ước đặt tên và định dạng đã cấu hình trong repository; các thành phần quan trọng cần có tên dễ hiểu và chú thích khi logic không hiển nhiên. | Should Have |
| NFR-14 | Kiểm thử chức năng trọng yếu | Các chức năng chính phải có kiểm thử phù hợp, tối thiểu bao gồm trường hợp thành công và các trường hợp dữ liệu không hợp lệ/lỗi thường gặp. Kết quả kiểm thử phải được kiểm tra trước khi tích hợp thay đổi. | Must Have |
| NFR-15 | Đóng gói bằng Docker | Các thành phần được đưa vào phạm vi triển khai phải có cấu hình Docker phù hợp để thành viên có thể tái tạo môi trường chạy theo hướng dẫn của nhóm. | Must Have |
| NFR-16 | Cấu hình theo môi trường | Cấu hình phát triển và triển khai phải được tách biệt. Bí mật không được hard-code vào mã nguồn hoặc đóng gói cố định vào image. Giá trị mẫu phải được cung cấp qua file ví dụ khi cần. | Must Have |
| NFR-17 | Hướng dẫn khởi chạy | Repository phải có hướng dẫn cài đặt, cấu hình và chạy các thành phần cần thiết, gồm các điều kiện tiên quyết và cách kiểm tra ứng dụng đã khởi động thành công. | Should Have |
| NFR-18 | Tương thích trình duyệt | Giao diện phải được kiểm tra trên các trình duyệt phổ biến mà nhóm thống nhất hỗ trợ; lỗi hiển thị hoặc thao tác chính phải được ghi nhận và xử lý trong phạm vi dự án. | Should Have |
| NFR-19 | Luồng thao tác dễ hiểu | Các bước xem sản phẩm, tùy chỉnh đồ uống, quản lý giỏ hàng và đặt hàng phải có nhãn rõ ràng, trình tự hợp lý và phản hồi sau thao tác. | Should Have |

**Quy ước MoSCoW:**
- **Must Have:** Bắt buộc để đạt mục tiêu và yêu cầu cốt lõi của phiên bản.
- **Should Have:** Quan trọng, nên hoàn thành nếu khả thi trong phạm vi hiện tại.
- **Could Have:** Có thể bổ sung nếu còn thời gian và nguồn lực.
- **Won't Have this release:** Không triển khai trong phiên bản hiện tại; có thể xem xét ở phiên bản sau.
