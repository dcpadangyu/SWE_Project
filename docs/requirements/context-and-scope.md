## Bối cảnh, Stakeholder và Phạm vi dự án

### Phân tích vấn đề nghiệp vụ BrewLite 

Khách hàng mua đồ uống hiện nay gặp bất tiện do mất thời gian xếp hàng tại quầy và quy trình thanh toán bằng tiền mặt kém hiệu quả. BrewLite được định hướng phát triển là ứng dụng đặt cà phê hướng tới mô hình giao dịch **không dùng tiền mặt** để giải quyết vấn đề này với tầm nhìn: "BrewLite giúp khách hàng đặt và thanh toán đồ uống trực tuyến chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.". Toàn bộ quy trình trải dài từ lúc người dùng chọn sản phẩm trên hệ thống đến lúc hoàn tất thanh toán trực tuyến.

### Bảng stakeholders
| Bên liên quan                     | Vai trò và trách nhiệm                                                                                                                               | Mục tiêu và kỳ vọng                                                                                                                                             |
| :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Khách hàng                        | Đặt đồ uống, chọn size/topping, thanh toán không tiền mặt và theo dõi trạng thái đơn hàng.                                                           | Hoàn tất thao tác mua hàng chỉ trong vài chạm, loại bỏ việc xếp hàng chờ đợi và nhận đồ uống nhanh chóng tại quầy.                                              |
| Nhân viên quầy/Barista            | Tiếp nhận đơn đặt hàng từ hệ thống và cập nhật trạng thái pha chế thực tế.                                                                           | Có công cụ hiển thị thông tin đặt món chính xác để pha chế đúng tùy chọn, giúp quản lý luồng đơn hiệu quả.                                                      |
| Quản lý cửa hàng/Product Owner    | Xác định yêu cầu nghiệp vụ hệ thống, sắp xếp thứ tự và phân tích mức độ ưu tiên cho Product Backlog và nghiệm thu Increment phầm mềm sau mỗi Sprint. | Đảm bảo sản phẩm bám sát tầm nhìn kinh doanh ban đầu và các tính năng được phát triển đúng tiến độ.                                                             |
| Giảng viên/ khách hàng nghiệm thu | Đánh giá toàn bộ quy trình phát triển, chất lượng sản phẩm cuối cùng và mức độ đáp ứng các tiêu chí chấp nhận.                                       | Xác nhận nhóm tuân thủ đúng yêu cầu kiến trúc bắt buộc (NestJS, Next.js, PostgreSQL), thiết lập thành công CI/CD và triển khai được trên môi trường production. |
| Nhóm phát triển                   | Phân tích yêu cầu nghiệp vụ, thiết kế kiến trúc hệ thống, lập trình, kiểm thử và thực hiện bàn giao hệ thống.                                        | Hoàn thành các hạng mục đạt chuẩn Definition of Done (DoD), tối ưu được nghiệp vụ xử lý backend chuyên sâu và nghiệm thu dự án thành công.                      |
| Đơn vị thanh toán                 | Cung cấp hoặc mô phỏng cổng giao dịch thông qua nền tảng Ví điện tử hoặc Thẻ ngân hàng trong phạm vi dự án.                                          | Hệ thống đối tác (BrewLite) truyền và gọi API ổn định, tích hợp thành công cơ chế idempotent để chặn các lỗi trừ tiền trùng lặp khi có sự cố mạng.              |

### Xác định danh mục phạm vi
#### In-scope
- Hiển thị danh sách các loại đồ uống (menu) bao gồm hình ảnh, tên và mức giá tương ứng.   
- Cung cấp giao diện xem chi tiết sản phẩm để người dùng chọn kích cỡ (size) và các loại topping.   
- Thao tác giỏ hàng: thêm sản phẩm, sửa, xóa sản phẩm và hệ thống tự động tính toán tổng số tiền.   
- Chức năng đăng ký và đăng nhập tài khoản người dùng thông qua xác thực token JWT.   
- Khởi tạo đơn hàng trên hệ thống và xử lý thanh toán không dùng tiền mặt.   
- Hiển thị màn hình xác nhận (mã đơn, trạng thái hiện tại) và danh sách lưu trữ lịch sử đặt hàng.   
- Xử lý các logic nghiệp vụ backend chuyên sâu: chuyển đổi trạng thái đơn hàng hợp lệ, cơ chế thanh toán idempotent, kiểm soát tồn kho bằng optimistic locking khi có giao dịch đặt đồng thời, tính điểm thưởng và áp dụng mã khuyến mãi.   

#### Out-of-scope
- Các chức năng thao tác của Nhân viên quầy/Barista bao gồm việc tiếp nhận đơn đặt hàng trực tiếp trên UI và cập nhật trạng thái pha chế. (nằm ngoài phạm vi của MVP) 

#### Giả định
- Cổng thanh toán thực tế của các bên thứ ba được thay thế bằng dịch vụ mô phỏng (Mock Payment Service).   
- Hệ thống đáp ứng tiêu chuẩn hiệu năng với thời gian phản hồi API dưới 500ms khi truy xuất cơ sở dữ liệu mẫu.   
- Giao diện ứng dụng hoạt động tương thích và ổn định trên các trình duyệt web tiêu chuẩn.   

#### Rủi ro
- Quá trình xử lý giao dịch thanh toán của người dùng bị lỗi khiến hệ thống chuyển đơn hàng sang trạng thái PAYMENT_FAILED.   
- Xảy ra tình trạng bán vượt quá số lượng nguyên liệu thực tế do sai lệch dữ liệu tồn kho khi nhiều khách hàng thao tác đặt mua hàng cùng một thời điểm.