## 3.1 MENU

### 3.1.1. FR-01 - Xem danh sách đồ uống

| Tên chức năng         | Mô tả                                                                                                                            | Tác nhân              | Điều kiện trước                                  | Ràng buộc/ngoại lệ                                                                                                                                                                                                                                                                                                                       | Ưu tiên |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Xem danh sách đồ uống | Cho phép khách hàng xem danh sách các sản phẩm đồ uống hiện có của cửa hàng, bao gồm hình ảnh, tên và giá bán của từng sản phẩm. | Customer (Khách hàng) | Khách hàng truy cập vào trang Menu của hệ thống. | Danh sách sản phẩm được lấy từ hệ thống thông qua API; nếu không có sản phẩm, hệ thống hiển thị trạng thái danh sách trống; nếu không thể tải dữ liệu, hệ thống hiển thị thông báo lỗi; sản phẩm có số lượng tồn kho bằng 0 phải được hiển thị trạng thái "Hết hàng"; hệ thống không cho phép khách hàng thêm sản phẩm hết hàng vào giỏ. | Must    |

- **Endpoint:** `GET /products`
- **Dữ liệu:** `id`, `name`, `price`, `imageUrl`, `stock`.

### Acceptance Criteria

- **AC-01.1:** Khi khách hàng truy cập trang Menu và hệ thống lấy dữ liệu thành công → hệ thống hiển thị danh sách đồ uống dưới dạng lưới sản phẩm.
- **AC-01.2:** Mỗi sản phẩm trong danh sách phải hiển thị đầy đủ tên sản phẩm, hình ảnh và giá bán.
- **AC-01.3:** Khi hệ thống đang tải danh sách sản phẩm → giao diện hiển thị trạng thái Loading.
- **AC-01.4:** Khi danh sách sản phẩm không có dữ liệu → hệ thống hiển thị trạng thái danh sách trống (Empty State).
- **AC-01.5:** Khi xảy ra lỗi trong quá trình tải danh sách sản phẩm → hệ thống hiển thị thông báo lỗi (Error State).
- **AC-01.6:** Khi khách hàng truy cập trang Menu trên thiết bị di động → hệ thống hiển thị danh sách sản phẩm với bố cục phù hợp kích thước màn hình, không gây tràn nội dung theo chiều ngang.
- **AC-01.7:** Khi sản phẩm có stock = 0 → hệ thống hiển thị trạng thái "Hết hàng" đối với sản phẩm tương ứng.

### 3.1.2. FR-02 - Xem chi tiết sản phẩm

| Tên chức năng         | Mô tả                                                                                                                                                        | Tác nhân              | Điều kiện trước                                                               | Ràng buộc/ngoại lệ                                                                                                                                                                                                                                                                                                    | Ưu tiên |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :---------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Xem chi tiết sản phẩm | Cho phép khách hàng xem thông tin chi tiết của một sản phẩm đồ uống, bao gồm tên, hình ảnh và giá bán, trước khi lựa chọn các tùy chọn và thêm vào giỏ hàng. | Customer (Khách hàng) | Khách hàng truy cập vào trang Menu và lựa chọn một sản phẩm cần xem chi tiết. | Sản phẩm được yêu cầu phải tồn tại trong hệ thống; nếu sản phẩm không tồn tại, hệ thống hiển thị thông báo phù hợp; nếu không thể tải thông tin sản phẩm, hệ thống hiển thị thông báo lỗi; khi sản phẩm hết hàng, hệ thống vẫn cho phép khách hàng xem thông tin chi tiết nhưng không cho phép thêm sản phẩm vào giỏ. | Must    |

- **Endpoint:** `GET /products/:id`
- **Dữ liệu:** `id`, `name`, `price`, `imageUrl`, `stock`.

### Acceptance Criteria

- **AC-02.1:** Khi khách hàng lựa chọn một sản phẩm từ danh sách Menu → hệ thống điều hướng đến màn hình chi tiết của sản phẩm tương ứng.
- **AC-02.2:** Khi khách hàng truy cập chi tiết một sản phẩm tồn tại và dữ liệu được tải thành công → hệ thống hiển thị thông tin sản phẩm bao gồm tên, hình ảnh và giá bán.
- **AC-02.3:** Khi khách hàng yêu cầu xem chi tiết sản phẩm có ID không tồn tại → hệ thống hiển thị thông báo không tìm thấy sản phẩm.
- **AC-02.4:** Khi hệ thống đang tải thông tin chi tiết sản phẩm → giao diện hiển thị trạng thái Loading.
- **AC-02.5:** Khi xảy ra lỗi trong quá trình tải thông tin chi tiết sản phẩm → hệ thống hiển thị thông báo lỗi (Error State).
- **AC-02.6:** Khi khách hàng xem chi tiết sản phẩm có stock = 0 → hệ thống hiển thị trạng thái "Hết hàng" và vô hiệu hóa chức năng "Thêm vào giỏ hàng".
- **AC-02.7:** Khi sản phẩm có stock > 0 và các tùy chọn hợp lệ → hệ thống cho phép khách hàng thực hiện thao tác thêm vào giỏ hàng.

### 3.1.3. FR-03 - Lựa chọn size và topping

| Tên chức năng            | Mô tả                                                                                                                                                                          | Tác nhân              | Điều kiện trước                                                              | Ràng buộc/ngoại lệ                                                                                                                                                                                                                                 | Ưu tiên |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Lựa chọn size và topping | Cho phép khách hàng lựa chọn kích thước (S/M/L) và topping cho sản phẩm đồ uống. Hệ thống mặc định chọn size M và tính toán, hiển thị giá dựa trên các tùy chọn được lựa chọn. | Customer (Khách hàng) | Khách hàng đang ở màn hình chi tiết của một sản phẩm tồn tại trong hệ thống. | Size mặc định là M; khách hàng chỉ được chọn một size tại một thời điểm; size và topping phải thuộc các tùy chọn hợp lệ của sản phẩm; hệ thống phải cập nhật giá khi khách hàng thay đổi lựa chọn; các tùy chọn không hợp lệ không được chấp nhận. | Must    |

- **Endpoint liên quan:** `GET /products/:id`
- **Dữ liệu:** Thông tin sản phẩm, danh sách size, topping và giá tương ứng với từng tùy chọn.

### Acceptance Criteria

- **AC-03.1:** Khi khách hàng truy cập màn hình chi tiết sản phẩm → hệ thống hiển thị các tùy chọn kích thước (S/M/L) và topping tương ứng với sản phẩm, đồng thời tự động chọn size M làm mặc định..
- **AC-03.2:** Khi khách hàng lựa chọn một size hợp lệ khác với size hiện tại → hệ thống cập nhật size được chọn và bỏ lựa chọn size trước đó, bảo đảm chỉ có một size được chọn tại một thời điểm.
- **AC-03.3:** Khi khách hàng lựa chọn topping hợp lệ → hệ thống ghi nhận và hiển thị topping được chọn.
- **AC-03.4:** Khi khách hàng truy cập chi tiết sản phẩm với size mặc định M → hệ thống hiển thị giá tương ứng với size M; khi khách hàng lựa chọn size và topping khác → hệ thống tính toán và hiển thị giá tương ứng với các tùy chọn đã chọn.
- **AC-03.5:** Khi khách hàng thay đổi size hoặc topping → hệ thống tự động cập nhật giá sản phẩm theo lựa chọn mới.
- **AC-03.6:** Khi khách hàng thực hiện lựa chọn size hoặc topping không hợp lệ → hệ thống không chấp nhận lựa chọn đó và không áp dụng giá của tùy chọn không hợp lệ.

## 3.2 Giỏ hàng (Cart)

### 3.2.1. FR-04 – Thêm sản phẩm vào giỏ hàng

| Tên chức năng              | Mô tả                                                                                                                                                      | Tác nhân              | Điều kiện trước                                                                                                                          | Ràng buộc/ngoại lệ                                                                                                                                                                                                                                                                                                                                                                                                                       | Ưu tiên |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Thêm sản phẩm vào giỏ hàng | Cho phép khách hàng thêm sản phẩm đồ uống đã lựa chọn vào giỏ hàng, bao gồm thông tin sản phẩm, size, topping, số lượng và giá tương ứng với các tùy chọn. | Customer (Khách hàng) | Khách hàng đang ở màn hình chi tiết của một sản phẩm tồn tại trong hệ thống và đã thực hiện các lựa chọn cần thiết để thêm vào giỏ hàng. | Sản phẩm phải tồn tại; size và topping được chọn phải hợp lệ; mỗi lần thêm tương ứng 1 đơn vị sản phẩm; các sản phẩm có cùng productId, size và danh sách topping được gộp số lượng; các sản phẩm khác tùy chọn được lưu thành dòng riêng; thông tin không hợp lệ không được chấp nhận; sản phẩm phải còn hàng; tổng số lượng được yêu cầu trong giỏ đối với sản phẩm không được vượt quá lượng tồn kho hiện tại được hệ thống cung cấp. | Must    |

- **Xử lý:** Quản lý trạng thái giỏ hàng tại Frontend (Zustand/Context).
- **Dữ liệu:** `productId`, `name`, `imageUrl`, `size`, `toppings`, `quantity`, `unitPrice`, `stock`.

### Acceptance Criteria:

- **AC-04.1:** Khi khách hàng lựa chọn sản phẩm cùng các tùy chọn hợp lệ và nhấn "Thêm vào giỏ hàng" → hệ thống thêm sản phẩm vào giỏ hàng thành công.
- **AC-04.2:** Khi khách hàng thêm một sản phẩm hợp lệ chưa tồn tại trong giỏ hàng với cùng cấu hình → hệ thống tạo một dòng sản phẩm mới có số lượng mặc định là 1.
- **AC-04.3:** Khi sản phẩm được thêm thành công → hệ thống ghi nhận đúng thông tin sản phẩm, size, topping, số lượng và giá tương ứng với các tùy chọn đã chọn.
- **AC-04.4:** Khi khách hàng thêm một sản phẩm có cùng `productId`, `size` và danh sách `toppings` với một sản phẩm đã có trong giỏ hàng → hệ thống gộp vào dòng sản phẩm hiện có và tăng số lượng của dòng đó thêm 1, không tạo dòng mới.
- **AC-04.5:** Khi khách hàng thêm sản phẩm có cùng `productId` nhưng khác `size` hoặc danh sách `toppings` → hệ thống tạo một dòng sản phẩm riêng trong giỏ hàng.
- **AC-04.6:** Khi khách hàng truy cập giỏ hàng sau khi thêm sản phẩm thành công → hệ thống hiển thị sản phẩm vừa được thêm cùng các thông tin đã lựa chọn.
- **AC-04.7:** Khi khách hàng thêm nhiều sản phẩm khác nhau vào giỏ hàng → hệ thống ghi nhận các sản phẩm được thêm mà không làm mất những sản phẩm đã có trước đó.
- **AC-04.8:** Khi thông tin sản phẩm, size hoặc topping không hợp lệ → hệ thống từ chối thao tác thêm sản phẩm và không làm thay đổi dữ liệu giỏ hàng.
- **AC-04.9:** Khi khách hàng thêm sản phẩm thành công và chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → thông tin sản phẩm trong giỏ hàng vẫn được duy trì.
- **AC-04.10:** Khi khách hàng thêm một sản phẩm có `stock = 0` → hệ thống từ chối thao tác và thông báo sản phẩm đã hết hàng.
- **AC-04.11:** Khi khách hàng thêm một sản phẩm vào giỏ hàng → hệ thống tính tổng số lượng của tất cả các dòng có cùng productId, không phân biệt size hoặc topping. Nếu tổng số lượng sau khi thêm vượt quá stock hiện tại → hệ thống từ chối thao tác và hiển thị thông báo số lượng còn lại.
- **AC-04.12:** Khi sản phẩm còn đủ tồn kho và các tùy chọn hợp lệ → hệ thống cho phép thêm sản phẩm vào giỏ hàng theo quy tắc gộp đã quy định tại FR-04.

### 3.2.2. FR-05 – Xem giỏ hàng

| Tên chức năng | Mô tả                                                                                                                                                                        | Tác nhân              | Điều kiện trước                                         | Ràng buộc/ngoại lệ                                                                                                                                                                                                                                                                                                | Ưu tiên |
| :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Xem giỏ hàng  | Cho phép khách hàng xem danh sách các sản phẩm đồ uống đã thêm vào giỏ hàng, bao gồm thông tin sản phẩm, size, topping, số lượng, đơn giá, thành tiền và tổng tiền giỏ hàng. | Customer (Khách hàng) | Khách hàng truy cập vào màn hình Giỏ hàng của hệ thống. | Giỏ hàng hiển thị dữ liệu từ trạng thái giỏ hàng hiện tại; các sản phẩm có cùng productId, size và danh sách topping được hiển thị chung một dòng với số lượng tương ứng; các sản phẩm khác cấu hình được hiển thị thành dòng riêng; nếu giỏ hàng không có sản phẩm, hệ thống hiển thị trạng thái giỏ hàng trống. | Must    |

- **Xử lý:** Đọc dữ liệu từ trạng thái giỏ hàng tại Frontend (Zustand/Context).
- **Dữ liệu:** `productId`, `name`, `imageUrl`, `size`, `toppings`, `quantity`, `unitPrice`, `lineTotal`, `cartTotal`.

### Acceptance Criteria

- **AC-05.1:** Khi khách hàng truy cập màn hình Giỏ hàng và giỏ hàng có sản phẩm → hệ thống hiển thị danh sách các sản phẩm đã được thêm vào giỏ hàng.
- **AC-05.2:** Mỗi dòng sản phẩm trong giỏ hàng phải hiển thị thông tin bao gồm tên sản phẩm, hình ảnh, size, topping đã chọn, số lượng, đơn giá và thành tiền tương ứng.
- **AC-05.3:** Khi giỏ hàng chứa các sản phẩm có cùng `productId`, `size` và danh sách `toppings` → hệ thống hiển thị các sản phẩm đó trên cùng một dòng với số lượng đã được gộp.
- **AC-05.4:** Khi giỏ hàng chứa các sản phẩm có cùng `productId` nhưng khác `size` hoặc danh sách `toppings` → hệ thống hiển thị các sản phẩm đó thành những dòng riêng biệt.
- **AC-05.5:** Khi khách hàng truy cập màn hình Giỏ hàng → hệ thống hiển thị tổng tiền hiện tại của các sản phẩm trong giỏ hàng.
- **AC-05.6:** Khi giỏ hàng không có sản phẩm → hệ thống hiển thị trạng thái giỏ hàng trống (Empty State) và không hiển thị sản phẩm không tồn tại trong giỏ.
- **AC-05.7:** Khi khách hàng thêm sản phẩm vào giỏ hàng và sau đó truy cập màn hình Giỏ hàng trong cùng phiên sử dụng ứng dụng → hệ thống hiển thị đầy đủ các sản phẩm đã được thêm cùng thông tin tương ứng.

### 3.2.3. FR-06 – Cập nhật số lượng sản phẩm trong giỏ hàng

| Tên chức năng                             | Mô tả                                                                                                                                                                      | Tác nhân              | Điều kiện trước                                                          | Ràng buộc/ngoại lệ                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Ưu tiên |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Cập nhật số lượng sản phẩm trong giỏ hàng | Cho phép khách hàng tăng hoặc giảm số lượng của từng dòng sản phẩm đã thêm vào giỏ hàng. Hệ thống tự động cập nhật thành tiền và tổng tiền giỏ hàng khi số lượng thay đổi. | Customer (Khách hàng) | Khách hàng đang ở màn hình Giỏ hàng và giỏ hàng có ít nhất một sản phẩm. | Sản phẩm cần cập nhật phải tồn tại trong giỏ hàng; số lượng của dòng sản phẩm đang tồn tại phải ≥ 1; khi giảm từ 1 xuống 0, hệ thống xóa dòng sản phẩm đó khỏi giỏ hàng; khi cập nhật một dòng sản phẩm, các dòng khác không bị thay đổi; hệ thống tính lại thành tiền và tổng tiền sau khi cập nhật thành công; khách hàng không được tăng số lượng vượt quá số lượng tồn kho hiện tại; số lượng sản phẩm trong giỏ không trực tiếp làm thay đổi tồn kho thực tế. | Must    |

- **Xử lý:** Cập nhật trạng thái giỏ hàng tại Frontend (Zustand/Context).
- **Dữ liệu:** `productId`, `size`, `toppings`, `quantity`, `unitPrice`, `lineTotal`, `cartTotal`, `stock`.

### Acceptance Criteria

- **AC-06.1:** Khi khách hàng tăng số lượng của một dòng sản phẩm trong giỏ hàng → hệ thống tăng số lượng của dòng sản phẩm tương ứng thêm 1 đơn vị.
- **AC-06.2:** Khi khách hàng giảm số lượng của một dòng sản phẩm có số lượng lớn hơn 1 → hệ thống giảm số lượng của dòng sản phẩm tương ứng đi 1 đơn vị.
- **AC-06.3:** Khi số lượng của một dòng sản phẩm bằng 1 và khách hàng tiếp tục thực hiện thao tác giảm → hệ thống giảm số lượng về 0 và tự động xóa dòng sản phẩm đó khỏi giỏ hàng.
- **AC-06.4:** Khi số lượng sản phẩm được cập nhật thành công → hệ thống tự động tính lại thành tiền của dòng sản phẩm dựa trên đơn giá và số lượng mới.
- **AC-06.5:** Khi số lượng sản phẩm thay đổi hoặc một dòng sản phẩm bị xóa do số lượng giảm về 0 → hệ thống tự động cập nhật tổng tiền giỏ hàng.
- **AC-06.6:** Khi khách hàng thay đổi số lượng của một dòng sản phẩm → hệ thống chỉ cập nhật dòng sản phẩm được chọn, không làm thay đổi số lượng, size hoặc topping của các dòng sản phẩm khác.
- **AC-06.7:** Khi khách hàng cập nhật số lượng thành công và chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → giỏ hàng vẫn duy trì các thay đổi đã thực hiện.
- **AC-06.8:** Khi khách hàng tăng số lượng sản phẩm nhưng số lượng mới vượt quá `stock` hiện tại → hệ thống từ chối thao tác tăng và hiển thị thông báo số lượng còn lại.
- **AC-06.9:** Khi khách hàng tăng số lượng sản phẩm và số lượng mới không vượt quá `stock` hiện tại → hệ thống cập nhật số lượng thành công và tính lại thành tiền, tổng tiền giỏ hàng.

### 3.2.4. FR-07 – Xóa sản phẩm khỏi giỏ hàng

| Tên chức năng              | Mô tả                                                                                                                                                                     | Tác nhân              | Điều kiện trước                                                          | Ràng buộc/ngoại lệ                                                                                                                                                                                                                                                                                 | Ưu tiên |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Xóa sản phẩm khỏi giỏ hàng | Cho phép khách hàng xóa một dòng sản phẩm đã thêm vào giỏ hàng mà không cần giảm số lượng từng đơn vị. Hệ thống cập nhật lại danh sách sản phẩm và tổng tiền sau khi xóa. | Customer (Khách hàng) | Khách hàng đang ở màn hình Giỏ hàng và giỏ hàng có ít nhất một sản phẩm. | Dòng sản phẩm cần xóa phải tồn tại trong giỏ hàng; hệ thống xác định đúng dòng sản phẩm dựa trên productId, size và danh sách toppings; khi xóa, toàn bộ số lượng của dòng được loại bỏ; các dòng sản phẩm khác không bị ảnh hưởng; thao tác xóa khỏi giỏ hàng không làm thay đổi tồn kho thực tế. | Must    |

- **Xử lý:** Cập nhật trạng thái giỏ hàng tại Frontend (Zustand/Context).
- **Dữ liệu:** `productId`, `size`, `toppings`, `quantity`, `lineTotal`, `cartTotal`.

### Acceptance Criteria

- **AC-07.1:** Khi khách hàng chọn chức năng "Xóa" đối với một dòng sản phẩm trong giỏ hàng → hệ thống xóa dòng sản phẩm tương ứng khỏi giỏ hàng.
- **AC-07.2:** Khi khách hàng xóa một dòng sản phẩm có số lượng lớn hơn 1 → hệ thống xóa toàn bộ số lượng của dòng sản phẩm đó, không chỉ giảm đi 1 đơn vị.
- **AC-07.3:** Khi khách hàng xóa một dòng sản phẩm → hệ thống xác định đúng dòng dựa trên `productId`, `size` và danh sách `toppings`, không xóa các dòng có cùng sản phẩm nhưng khác cấu hình.
- **AC-07.4:** Khi một dòng sản phẩm được xóa thành công → hệ thống cập nhật danh sách giỏ hàng và tự động tính lại tổng tiền dựa trên các sản phẩm còn lại.
- **AC-07.5:** Khi khách hàng xóa một dòng sản phẩm → các dòng sản phẩm khác trong giỏ hàng vẫn giữ nguyên thông tin, số lượng, size và topping đã chọn.
- **AC-07.6:** Khi khách hàng xóa sản phẩm cuối cùng trong giỏ hàng → hệ thống hiển thị trạng thái giỏ hàng trống (Empty State) và tổng tiền bằng 0.
- **AC-07.7:** Khi dòng sản phẩm cần xóa không tồn tại trong giỏ hàng → hệ thống không thực hiện thay đổi đối với các dòng sản phẩm hiện có.
- **AC-07.8:** Khi khách hàng xóa sản phẩm thành công và chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → trạng thái giỏ hàng sau khi xóa vẫn được duy trì.

### 3.2.5. FR-08 – Tự động tính tổng tiền giỏ hàng

| Tên chức năng                   | Mô tả                                                                                                                                                                                                                                                             | Tác nhân              | Điều kiện trước                                                                                                | Ràng buộc/ngoại lệ                                                                                                                                                                                                                    | Ưu tiên |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------ |
| Tự động tính tổng tiền giỏ hàng | Cho phép hệ thống tự động tính toán và hiển thị thành tiền của từng dòng sản phẩm và tổng tiền giỏ hàng dựa trên đơn giá theo size, topping và số lượng sản phẩm. Tổng tiền được cập nhật khi khách hàng thêm, thay đổi số lượng hoặc xóa sản phẩm khỏi giỏ hàng. | Customer (Khách hàng) | Khách hàng có thể truy cập giỏ hàng; hệ thống có thông tin giá và số lượng của các sản phẩm đang có trong giỏ. | Đơn giá phải tương ứng với size và topping đã chọn; số lượng phải hợp lệ; thành tiền mỗi dòng bằng đơn giá nhân số lượng; tổng tiền giỏ hàng bằng tổng thành tiền của tất cả các dòng sản phẩm; khi giỏ hàng trống, tổng tiền bằng 0. | Must    |

- **Xử lý:** Tính toán và cập nhật tổng tiền dựa trên trạng thái giỏ hàng tại Frontend (Zustand/Context).
- **Dữ liệu:** `productId`, `size`, `toppings`, `quantity`, `unitPrice`, `lineTotal`, `cartTotal`.

### Acceptance Criteria

- **AC-08.1:** Khi khách hàng thêm một sản phẩm với size và topping hợp lệ vào giỏ hàng → hệ thống xác định đơn giá của sản phẩm tương ứng với các tùy chọn đã chọn.
- **AC-08.2:** Khi một dòng sản phẩm có đơn giá và số lượng hợp lệ → hệ thống tính thành tiền của dòng sản phẩm bằng đơn giá nhân với số lượng.
- **AC-08.3:** Khi giỏ hàng có một hoặc nhiều dòng sản phẩm → hệ thống tính tổng tiền giỏ hàng bằng tổng thành tiền của tất cả các dòng sản phẩm hiện có.
- **AC-08.4:** Khi khách hàng thêm sản phẩm mới vào giỏ hàng → hệ thống tự động tính lại và hiển thị tổng tiền giỏ hàng sau khi thêm.
- **AC-08.5:** Khi khách hàng thêm sản phẩm trùng `productId`, `size` và danh sách `toppings` với một dòng đã tồn tại → hệ thống tăng số lượng của dòng tương ứng và cập nhật thành tiền, tổng tiền theo số lượng mới.
- **AC-08.6:** Khi khách hàng tăng hoặc giảm số lượng sản phẩm trong giỏ hàng → hệ thống tự động tính lại thành tiền của dòng sản phẩm được cập nhật và tổng tiền giỏ hàng.
- **AC-08.7:** Khi khách hàng xóa một dòng sản phẩm khỏi giỏ hàng hoặc giảm số lượng của dòng đó từ 1 xuống 0 → hệ thống loại bỏ thành tiền của dòng sản phẩm đó khỏi tổng tiền giỏ hàng.
- **AC-08.8:** Khi giỏ hàng không còn sản phẩm → hệ thống hiển thị tổng tiền bằng 0.
- **AC-08.9:** Khi khách hàng xem giỏ hàng sau khi thực hiện các thao tác thêm, cập nhật hoặc xóa sản phẩm → tổng tiền hiển thị phải tương ứng với dữ liệu giỏ hàng hiện tại.

### 3.2.6. FR-09 – Hiển thị số lượng sản phẩm trên Cart Badge

| Tên chức năng                              | Mô tả                                                                                                                                                                                                                                                | Tác nhân              | Điều kiện trước                                                             | Ràng buộc/ngoại lệ                                                                                                                                                                                                                 | Ưu tiên |
| :----------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| Hiển thị số lượng sản phẩm trên Cart Badge | Cho phép khách hàng theo dõi tổng số lượng sản phẩm hiện có trong giỏ hàng thông qua chỉ số hiển thị trên biểu tượng giỏ hàng (Cart Badge). Hệ thống tự động cập nhật chỉ số khi khách hàng thêm, thay đổi số lượng hoặc xóa sản phẩm khỏi giỏ hàng. | Customer (Khách hàng) | Khách hàng đang sử dụng giao diện hệ thống có hiển thị biểu tượng giỏ hàng. | Cart Badge hiển thị tổng số lượng đơn vị sản phẩm trong giỏ hàng, không phải số dòng sản phẩm; chỉ số phải là số nguyên không âm; khi giỏ hàng thay đổi, chỉ số được cập nhật tương ứng; khi giỏ hàng trống, tổng số lượng bằng 0. | Must    |

- **Xử lý:** Đọc và cập nhật tổng số lượng sản phẩm từ trạng thái giỏ hàng tại Frontend (Zustand/Context).
- **Dữ liệu:** `quantity`, `cartItemCount`.

### Acceptance Criteria

- **AC-09.1:** Khi giỏ hàng có ít nhất một sản phẩm → hệ thống hiển thị tổng số lượng sản phẩm hiện có trên Cart Badge.
- **AC-09.2:** Khi giỏ hàng chứa nhiều dòng sản phẩm với số lượng khác nhau → hệ thống tính tổng số lượng bằng tổng `quantity` của tất cả các dòng sản phẩm.
- **AC-09.3:** Khi khách hàng thêm một sản phẩm mới hoặc thêm sản phẩm trùng cấu hình đã tồn tại trong giỏ hàng → hệ thống tự động tăng chỉ số Cart Badge thêm 1.
- **AC-09.4:** Khi khách hàng tăng hoặc giảm số lượng của một dòng sản phẩm → hệ thống tự động cập nhật chỉ số Cart Badge theo tổng số lượng mới.
- **AC-09.5:** Khi khách hàng xóa một dòng sản phẩm khỏi giỏ hàng → hệ thống giảm chỉ số Cart Badge tương ứng với toàn bộ số lượng của dòng sản phẩm bị xóa.
- **AC-09.6:** Khi khách hàng giảm số lượng của dòng sản phẩm từ 1 xuống 0 → hệ thống xóa dòng sản phẩm đó và cập nhật chỉ số Cart Badge tương ứng.
- **AC-09.7:** Khi giỏ hàng không còn sản phẩm → tổng số lượng của Cart Badge bằng 0.
- **AC-09.8:** Khi khách hàng chuyển sang màn hình khác trong cùng phiên sử dụng ứng dụng → Cart Badge vẫn hiển thị số lượng sản phẩm tương ứng với trạng thái giỏ hàng hiện tại.
