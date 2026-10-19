# Software Requirements Specification (SRS) — BrewLite

- **Dự án:** BrewLite — Ứng dụng đặt cà phê không dùng tiền mặt
- **Môn học:** Công nghệ Phần mềm, Trường Đại học Sài Gòn
- **Phương pháp phát triển:** Agile Scrum
- **Phiên bản:** 0.1 (bản nháp)
- **Trạng thái:** Draft — cần nhóm rà soát và thống nhất

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

## 3. Yêu cầu chức năng (FR)

> Các phần dưới đây là khung để thành viên phụ trách bổ sung mã FR, mô tả chi tiết, tiền/hậu điều kiện, tiêu chí chấp nhận (AC) và ưu tiên MoSCoW. Tránh tự gán mã trùng nhau; nhóm cần thống nhất quy ước mã trước khi merge.

### 3.1. Tài khoản và xác thực (User & Authentication)

*Phụ trách: thành viên 4.*

- Đăng ký và đăng nhập.
- Xác thực người dùng và bảo vệ các API cần đăng nhập.
- Các chức năng tài khoản khác đã được nhóm thống nhất.

### 3.2. Menu và sản phẩm (Product & Menu)

*Phụ trách: thành viên 3.*

- Xem danh sách menu.
- Xem chi tiết sản phẩm.
- Chọn kích cỡ và topping nếu sản phẩm hỗ trợ.

### 3.3. Giỏ hàng (Cart)

*Phụ trách: thành viên 3.*

- Thêm sản phẩm vào giỏ hàng.
- Thay đổi số lượng hoặc tùy chọn sản phẩm.
- Xóa sản phẩm và xem tạm tính giỏ hàng.

### 3.4. Đặt hàng và thanh toán (Orders & Payments)

*Phụ trách: thành viên 4.*

- Tạo đơn hàng từ giỏ hàng.
- Thực hiện thanh toán bằng phương thức được nhóm hỗ trợ.
- Xem lịch sử và trạng thái đơn hàng.

Mỗi FR chính thức cần có: mã duy nhất, tên, mô tả, tác nhân, điều kiện trước/sau khi cần thiết, AC có thể kiểm thử và mức ưu tiên MoSCoW.

## 4. Yêu cầu phi chức năng (NFR)

### 4.1. Hiệu năng (Performance)

**NFR-PERF-01 — Thời gian phản hồi API**  
Trong môi trường kiểm thử và tải mục tiêu do nhóm thống nhất, ít nhất 95% yêu cầu đến các API thuộc phạm vi kiểm thử phải có thời gian phản hồi dưới 500 ms. Không tính thời gian chờ do dịch vụ bên ngoài nếu nhóm không kiểm soát được; điều kiện đo phải được ghi lại trong báo cáo kiểm thử.

**NFR-PERF-02 — Khả năng xử lý tải**  
Nhóm phải xác định một kịch bản tải đại diện cho đồ án và kiểm thử các API chính. Báo cáo phải ghi nhận số yêu cầu đồng thời, thời gian phản hồi, tỷ lệ lỗi và cấu hình môi trường.

### 4.2. Bảo mật (Security)

**NFR-SEC-01 — Xác thực**  
Các API yêu cầu đăng nhập phải xác minh thông tin xác thực trước khi xử lý yêu cầu. Nếu dùng JWT, backend phải kiểm tra chữ ký và thời hạn token; token không hợp lệ hoặc hết hạn phải bị từ chối.

**NFR-SEC-02 — Phân quyền**  
Backend phải kiểm tra quyền truy cập cho các thao tác/tài nguyên được bảo vệ. Không được chỉ dựa vào việc ẩn nút hoặc chặn trang trên frontend để bảo vệ tài nguyên.

**NFR-SEC-03 — Bảo vệ mật khẩu**  
Mật khẩu phải được băm bằng thuật toán chuyên dụng cho mật khẩu, chẳng hạn Argon2id hoặc bcrypt, trước khi lưu. Không lưu mật khẩu dạng văn bản thuần và không ghi mật khẩu vào log.

**NFR-SEC-04 — Quản lý bí mật**  
Khóa JWT, mật khẩu cơ sở dữ liệu và thông tin xác thực khác phải được cung cấp qua biến môi trường hoặc cơ chế quản lý bí mật phù hợp. Không commit giá trị bí mật thực vào Git; file `.env.example` chỉ chứa giá trị mẫu không nhạy cảm.

**NFR-SEC-05 — Kiểm tra dữ liệu đầu vào và lỗi**  
Backend phải xác thực dữ liệu đầu vào của API, từ chối dữ liệu sai định dạng/không hợp lệ và không trả về stack trace, khóa bí mật hoặc thông tin nội bộ nhạy cảm cho người dùng.

### 4.3. Tính khả dụng và độ tin cậy (Availability & Reliability)

**NFR-AVL-01 — Phản hồi giao diện**  
Giao diện cần thể hiện trạng thái đang xử lý, thành công và lỗi cho các thao tác chính, đồng thời cung cấp thông báo dễ hiểu để người dùng biết bước tiếp theo.

**NFR-AVL-02 — Xử lý lỗi**  
Các lỗi dự kiến từ API hoặc dịch vụ phụ thuộc phải được xử lý bằng phản hồi phù hợp. Một yêu cầu lỗi không được làm dừng toàn bộ ứng dụng; chi tiết nội bộ chỉ được ghi log ở nơi phù hợp.

**NFR-AVL-03 — Tính nhất quán đơn hàng**  
Khi cơ sở dữ liệu được tích hợp, thao tác cập nhật nhiều bản ghi có liên quan đến việc tạo đơn phải sử dụng transaction khi phù hợp để tránh trạng thái dữ liệu dở dang.

**NFR-AVL-04 — Khôi phục sau sự cố**  
Nhóm phải ghi rõ cách khởi động lại các dịch vụ sau sự cố. Khi có lưu dữ liệu đơn hàng, cần kiểm tra dữ liệu đã xác nhận vẫn được giữ theo cấu hình lưu trữ và phục hồi đã chọn.

### 4.4. Khả năng bảo trì và kiểm thử (Maintainability & Testability)

**NFR-MNT-01 — Cấu trúc module**  
Mã nguồn cần được tổ chức theo trách nhiệm rõ ràng, hạn chế trộn logic nghiệp vụ, xử lý API và giao diện trong cùng một thành phần không cần thiết.

**NFR-MNT-02 — Tính nhất quán mã nguồn**  
Nhóm phải tuân theo quy ước đặt tên và định dạng đã cấu hình trong repository; các thành phần quan trọng cần có tên dễ hiểu và chú thích khi logic không hiển nhiên.

**NFR-MNT-03 — Kiểm thử chức năng trọng yếu**  
Các chức năng chính phải có kiểm thử phù hợp, tối thiểu bao gồm trường hợp thành công và các trường hợp dữ liệu không hợp lệ/lỗi thường gặp. Kết quả kiểm thử phải được kiểm tra trước khi tích hợp thay đổi.

### 4.5. Đóng gói và triển khai (Deployment)

**NFR-DEP-01 — Đóng gói bằng Docker**  
Các thành phần được đưa vào phạm vi triển khai phải có cấu hình Docker phù hợp để thành viên có thể tái tạo môi trường chạy theo hướng dẫn của nhóm.

**NFR-DEP-02 — Cấu hình theo môi trường**  
Cấu hình phát triển và triển khai phải được tách biệt. Bí mật không được hard-code vào mã nguồn hoặc đóng gói cố định vào image. Giá trị mẫu phải được cung cấp qua file ví dụ khi cần.

**NFR-DEP-03 — Hướng dẫn khởi chạy**  
Repository phải có hướng dẫn cài đặt, cấu hình và chạy các thành phần cần thiết, gồm các điều kiện tiên quyết và cách kiểm tra ứng dụng đã khởi động thành công.

### 4.6. Khả năng tương thích và sử dụng (Compatibility & Usability)

**NFR-CMP-01 — Tương thích trình duyệt**  
Giao diện phải được kiểm tra trên các trình duyệt phổ biến mà nhóm thống nhất hỗ trợ; lỗi hiển thị hoặc thao tác chính phải được ghi nhận và xử lý trong phạm vi dự án.

**NFR-USE-01 — Luồng thao tác dễ hiểu**  
Các bước xem sản phẩm, tùy chỉnh đồ uống, quản lý giỏ hàng và đặt hàng phải có nhãn rõ ràng, trình tự hợp lý và phản hồi sau thao tác.

## 5. Bảng ưu tiên MoSCoW cho NFR

| Mã NFR | Tóm tắt yêu cầu | Ưu tiên | Lý do |
|---|---|---|---|
| NFR-PERF-01 | 95% API dưới 500 ms trong điều kiện kiểm thử đã xác định | Must Have | Mốc hiệu năng trọng tâm được giao |
| NFR-PERF-02 | Kiểm thử tải và ghi nhận số liệu | Should Have | Đánh giá hiệu năng có căn cứ |
| NFR-SEC-01 | Xác thực và kiểm tra JWT nếu sử dụng | Must Have | Bảo vệ API cần đăng nhập |
| NFR-SEC-02 | Kiểm tra quyền ở backend | Must Have | Ngăn truy cập trái phép |
| NFR-SEC-03 | Băm mật khẩu | Must Have | Bảo vệ thông tin tài khoản |
| NFR-SEC-04 | Quản lý bí mật an toàn | Must Have | Tránh lộ thông tin nhạy cảm |
| NFR-SEC-05 | Xác thực đầu vào và lỗi an toàn | Must Have | Giảm lỗi và rủi ro bảo mật |
| NFR-AVL-01 | Hiển thị trạng thái thao tác | Should Have | Cải thiện trải nghiệm sử dụng |
| NFR-AVL-02 | Xử lý lỗi phù hợp | Must Have | Tăng độ tin cậy và tránh lộ thông tin |
| NFR-AVL-03 | Nhất quán dữ liệu đơn hàng | Must Have | Đảm bảo tính đúng đắn nghiệp vụ |
| NFR-AVL-04 | Hướng dẫn và kiểm tra khôi phục | Should Have | Hỗ trợ xử lý sự cố |
| NFR-MNT-01 | Cấu trúc module rõ ràng | Should Have | Hỗ trợ tích hợp và bảo trì |
| NFR-MNT-02 | Quy ước mã nguồn nhất quán | Should Have | Giúp cộng tác hiệu quả |
| NFR-MNT-03 | Kiểm thử chức năng trọng yếu | Must Have | Phát hiện lỗi trước khi tích hợp |
| NFR-DEP-01 | Đóng gói Docker | Must Have | Theo yêu cầu được giao |
| NFR-DEP-02 | Tách cấu hình và bí mật | Must Have | Tránh lộ bí mật và sai cấu hình |
| NFR-DEP-03 | Hướng dẫn chạy dự án | Should Have | Giúp thành viên tái tạo môi trường |
| NFR-CMP-01 | Kiểm tra trình duyệt mục tiêu | Should Have | Hỗ trợ khả năng truy cập |
| NFR-USE-01 | Luồng thao tác rõ ràng | Should Have | Hỗ trợ người dùng hoàn thành tác vụ |

**Quy ước MoSCoW**

- **Must Have:** Bắt buộc để đạt mục tiêu và yêu cầu cốt lõi của phiên bản.
- **Should Have:** Quan trọng, nên hoàn thành nếu khả thi trong phạm vi hiện tại.
- **Could Have:** Có thể bổ sung nếu còn thời gian và nguồn lực.
- **Won't Have this release:** Không triển khai trong phiên bản hiện tại; có thể xem xét ở phiên bản sau.

Các mức ưu tiên là đề xuất ban đầu, cần được cả nhóm xác nhận. Không nên gán Won't Have cho yêu cầu bắt buộc trong đề bài nếu chưa có quyết định chính thức.

## 6. Phương pháp xác minh NFR

| Nhóm | Cách xác minh | Bằng chứng cần lưu |
|---|---|---|
| Hiệu năng | Chạy kiểm thử tải trên các API mục tiêu | Điều kiện tải, số liệu thời gian phản hồi và tỷ lệ lỗi |
| Xác thực/phân quyền | Thử token hợp lệ, không hợp lệ, hết hạn và truy cập không đủ quyền | Kết quả phản hồi của API |
| Mật khẩu | Kiểm tra cách lưu dữ liệu tài khoản | Xác nhận không lưu mật khẩu dạng văn bản thuần |
| Xử lý lỗi | Gửi dữ liệu sai định dạng và mô phỏng lỗi phụ thuộc | Phản hồi an toàn, log phù hợp |
| Nhất quán dữ liệu | Kiểm thử các thao tác tạo/cập nhật đơn khi có database | Kết quả dữ liệu trước và sau thao tác |
| Docker | Dựng môi trường từ cấu hình trong repository | Lệnh chạy và kết quả khởi động |
| Bảo trì/kiểm thử | Chạy lint, test và review code | Kết quả lệnh và danh sách lỗi còn lại |
| Tương thích | Kiểm tra luồng chính trên trình duyệt mục tiêu | Danh sách trình duyệt và kết quả kiểm thử |

## 7. Giả định và vấn đề cần nhóm thống nhất

- Mốc dưới 500 ms cần có điều kiện kiểm thử cụ thể: môi trường, số lượng yêu cầu, dữ liệu và cách tính thời gian phản hồi.
- Chưa đặt mục tiêu uptime/SLA vì đề bài hiện chưa nêu con số cụ thể.
- Cơ sở dữ liệu PostgreSQL sẽ được tích hợp ở task sau; các yêu cầu liên quan transaction cần xác minh khi phần này được triển khai.
- Cổng thanh toán thực tế và dịch vụ bên ngoài phụ thuộc quyết định về phạm vi tích hợp.
- Nhóm cần thống nhất mã FR, mã NFR và cách quản lý thay đổi để tránh trùng lặp.
- Bảng MoSCoW trong tài liệu là đề xuất ban đầu và cần được review trong backlog.

## 8. Lịch sử thay đổi

| Phiên bản | Ngày | Nội dung | Người phụ trách |
|---|---|---|---|
| 1 | 2026-10-19 | Tạo khung SRS, đề xuất NFR, MoSCoW và cách xác minh | Thành viên 5 — Thanh Duy |