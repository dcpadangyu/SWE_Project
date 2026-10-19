# UC-CHECKOUT-01 – Luồng thay thế, Luồng ngoại lệ & Liên kết yêu cầu

- **Use Case:** UC-CHECKOUT-01 – Đặt món và Thanh toán không dùng tiền mặt (Task 1.3)
- **Phụ trách phần này:** Thành viên 7
- **Phạm vi:** Bổ sung cho phần Actor / Trigger / Tiền-Hậu điều kiện / Luồng chính (Happy Path) do Thành viên 6 soạn. Nội dung dưới đây được ghép vào `docs/requirements/use-case-checkout.md` thay cho mục "Ngoại lệ & Rẽ nhánh" (mục 7 cũ), đánh số tiếp từ mục 7.
- **Quy ước:** "Bước N" là bước N trong bảng Happy Path (mục 6). Mã `A*` = Alternate flow (vẫn dẫn tới thành công), mã `E*` = Exception flow (thất bại hoặc bị chặn). Trạng thái đơn dùng enum: `PENDING`, `PAID`, `PAYMENT_FAILED`, `CANCELLED`, `PREPARING`, `READY`, `COMPLETED`.
- **Sơ đồ liên quan:** `docs/diagrams/usecase-overview.puml` (.svg) – các use case mở rộng *Đổi size/topping*, *Áp dụng voucher*, *Thử lại/đổi phương thức* tương ứng A2, A1, E3.

---

## 7. Luồng thay thế (Alternate Flows)

### A1 – Áp dụng voucher (rẽ nhánh từ Bước 3 hoặc Bước 4)

- **Điều kiện kích hoạt:** Khách hàng nhập mã voucher tại màn hình Giỏ hàng / chọn phương thức thanh toán rồi bấm **"Áp dụng"**.

| Bước | Tác nhân | Phản hồi của Hệ thống |
| :---: | :--- | :--- |
| A1.1 | Khách hàng nhập mã voucher và bấm **"Áp dụng"**. | Frontend kiểm tra định dạng (không rỗng, đúng độ dài); gửi mã lên backend cùng nội dung giỏ hàng. |
| A1.2 | *(Hệ thống tự động)* | Backend kiểm tra voucher: tồn tại, đang hoạt động, chưa hết hạn, đạt giá trị đơn tối thiểu, chưa hết lượt dùng. |
| A1.3 | *(Hệ thống tự động)* | Voucher hợp lệ: tính số tiền giảm, hiển thị lại **Tạm tính – Giảm giá – Tổng thanh toán**. Số tiền cuối cùng này được dùng ở Bước 4–5 (tạo đơn và gọi cổng thanh toán). |
| A1.4 | Khách hàng tiếp tục từ **Bước 4**. | Luồng chính tiếp tục; đơn lưu kèm mã voucher và số tiền giảm. |

- **Nhánh lỗi A1-x – Voucher không hợp lệ:** (không tồn tại / hết hạn / chưa đạt giá trị tối thiểu / hết lượt) → hiển thị thông báo lý do cụ thể, **không** thay đổi tổng tiền, khách hàng có thể nhập mã khác hoặc bỏ qua và tiếp tục Bước 4.
- **Ràng buộc:** mỗi đơn chỉ áp dụng tối đa **1** voucher; tổng thanh toán sau giảm không âm (tối thiểu 0); voucher được kiểm tra lại ở backend khi tạo đơn (không tin số tiền do client gửi).
- **Hậu điều kiện:** Đơn có `discount_amount` và `voucher_code`; lượt dùng voucher chỉ bị trừ khi đơn chuyển sang `PAID`.

### A2 – Đổi size / topping / số lượng trong giỏ hàng (rẽ nhánh từ Bước 3)

| Bước | Tác nhân | Phản hồi của Hệ thống |
| :---: | :--- | :--- |
| A2.1 | Tại màn hình Giỏ hàng, khách hàng bấm **"Sửa"** trên một món. | Hiển thị lại tùy chọn hiện tại (Size S/M/L, Topping, số lượng) của món đó. |
| A2.2 | Khách hàng đổi size, thêm/bớt topping hoặc đổi số lượng, bấm **"Cập nhật"**. | Hệ thống tính lại đơn giá dòng (giá size + phụ thu topping) × số lượng, cập nhật tổng tiền và badge giỏ hàng. |
| A2.3 | *(Hệ thống tự động)* | Nếu đã áp voucher (A1) thì kiểm tra lại điều kiện voucher với tổng mới; không còn đạt điều kiện → gỡ voucher và báo cho khách. |
| A2.4 | Khách hàng quay lại **Bước 3**. | Luồng chính tiếp tục với giỏ hàng đã cập nhật. |

- **Biến thể A2b – Xóa món / giảm số lượng về 0:** món bị xóa khỏi giỏ, tổng tiền tính lại. Nếu giỏ hàng **rỗng** thì nút "Thanh toán" bị vô hiệu hóa và hiển thị trạng thái giỏ trống kèm nút quay lại thực đơn (không vào được Bước 4).
- **Hậu điều kiện:** Giỏ hàng phản ánh đúng lựa chọn mới; chưa có đơn nào được tạo.

### A3 – Đổi phương thức thanh toán trước khi xác nhận (rẽ nhánh từ Bước 4)

- Tại Bước 4 khách hàng chuyển giữa **Ví điện tử** và **Thẻ** trước khi bấm **"Xác nhận trả"**. Hệ thống chỉ cập nhật lựa chọn trên giao diện (và các trường nhập liệu tương ứng: số thẻ/ngày hết hạn đối với Thẻ); chưa tạo đơn và chưa gọi cổng thanh toán. Sau đó tiếp tục Bước 4 bình thường.

---

## 8. Luồng ngoại lệ (Exception Flows)

### E1 – Chưa đăng nhập hoặc JWT hết hạn khi xác nhận tạo đơn (Bước 3–4)

- **Phát hiện:** Khách hàng chưa có token, hoặc backend trả `401 Unauthorized` khi gọi `POST /orders` (token thiếu/sai/hết hạn).
- **Xử lý:** Lưu giỏ hàng (localStorage) → chuyển sang `/login` kèm đường dẫn quay lại. Đăng nhập thành công → tự động quay lại Giỏ hàng, **giỏ hàng và voucher còn nguyên**; khách bấm "Thanh toán" lại từ Bước 3.
- **Kết quả:** Chưa tạo đơn nào. Nếu khách hủy đăng nhập, giỏ hàng vẫn được giữ.

### E2 – Hết hàng (Bước 4 và Bước 6)

- **E2a – Hết hàng khi tạo đơn (Bước 4):** Trong transaction tạo đơn, backend kiểm tra tồn kho từng sản phẩm; `stock` không đủ cho số lượng yêu cầu → rollback toàn bộ, **không** tạo đơn, trả `409 Conflict` kèm danh sách món thiếu hàng và số lượng còn lại.
  - Hệ thống hiển thị thông báo "Món X chỉ còn N phần / đã hết hàng", đánh dấu món lỗi trong giỏ và yêu cầu khách giảm số lượng hoặc xóa món. Khách cập nhật xong (có thể dùng A2) rồi quay lại Bước 3.
- **E2b – Tồn kho thay đổi giữa lúc tạo đơn và lúc ghi nhận thanh toán (Bước 6):** hai khách mua món cuối cùng cùng lúc → optimistic locking của tồn kho thất bại.
  - Đơn chuyển sang `CANCELLED`, backend gọi hủy/hoàn tiền giao dịch (nếu cổng đã trừ tiền), thông báo cho khách và đề nghị chọn món khác. Giỏ hàng được giữ lại.
- **Kết quả:** Không có đơn `PAID` nào khi tồn kho không đủ; tồn kho không bao giờ âm.

### E3 – Giao dịch thanh toán thất bại (Bước 5–6)

- **Nguyên nhân thường gặp:** ví không đủ số dư, thẻ không hợp lệ/bị từ chối, cổng thanh toán trả lỗi.
- **Xử lý của hệ thống:**
  1. Ghi nhận bản ghi thanh toán là thất bại (kèm mã lỗi), chuyển đơn sang `PAYMENT_FAILED`.
  2. **Không** trừ tồn kho, **không** cộng điểm Loyalty, **không** sử dụng lượt voucher.
  3. Giữ nguyên giỏ hàng và voucher; hiển thị lý do lỗi dễ hiểu.
  4. Hiển thị hai lựa chọn: **"Thử lại"** hoặc **"Đổi phương thức"** (use case mở rộng *Thử lại / đổi phương thức khi thanh toán lỗi*).
- **Thử lại:** mỗi lần thử là một lần thanh toán mới với `Idempotency-Key` **mới** (khóa cũ đã gắn với kết quả thất bại và sẽ trả lại kết quả đó). Đơn quay lại `PENDING` khi bắt đầu lần thử mới; giới hạn tối đa **3** lần thử cho mỗi đơn, vượt quá thì đơn chuyển `CANCELLED` và khách được đưa về Giỏ hàng.
- **Kết quả:** Thành công ở lần thử sau → tiếp tục **Bước 6–7** của luồng chính.

### E4 – Mất mạng / hết thời gian chờ (Bước 4–6)

- **E4a – Mất mạng trước khi gửi yêu cầu:** Frontend phát hiện offline (`navigator.onLine` hoặc request lỗi mạng) → vô hiệu hóa nút "Xác nhận trả", hiển thị thông báo "Mất kết nối, vui lòng kiểm tra mạng". Giỏ hàng được giữ trong localStorage. Có mạng lại → khách bấm xác nhận lại; chưa có đơn hay giao dịch nào nên an toàn.
- **E4b – Mất mạng/timeout sau khi đã gửi (không nhận được phản hồi):** Frontend không biết đơn đã được tạo/thanh toán hay chưa.
  - Frontend hiển thị "Đang xác nhận kết quả…" và **gửi lại cùng `Idempotency-Key`** (tự động thử lại có giới hạn, ví dụ 3 lần, giãn cách tăng dần).
  - Backend nhận khóa đã tồn tại → trả lại **đúng kết quả đã lưu** (đơn/thanh toán cũ), tuyệt đối không tạo đơn mới hay trừ tiền lần hai.
  - Nếu vẫn không có kết quả: hiển thị "Chưa xác nhận được thanh toán" cùng nút kiểm tra lại; khách có thể xem trạng thái đơn tại **Lịch sử đơn hàng** (`GET /orders/me`). Đơn ở `PENDING` quá thời hạn (đề xuất 15 phút) mà chưa có kết quả thanh toán thì được hệ thống chuyển `CANCELLED`/đối soát lại với cổng.
- **E4c – Cổng thanh toán (Mock) không phản hồi / timeout:** Backend đặt timeout cho lời gọi cổng; hết thời gian thì đơn giữ `PENDING`, trả lỗi "đang xử lý" cho frontend và truy vấn lại kết quả bằng cùng `Idempotency-Key`; không tự động trừ tiền lần nữa.
- **Kết quả:** Dù gửi lại bao nhiêu lần, mỗi đơn chỉ có **tối đa một** giao dịch thành công.

### E5 – Khách bấm xác nhận nhiều lần / mở nhiều tab (Bước 4)

- Frontend vô hiệu hóa nút ngay sau lần bấm đầu (trạng thái loading). Nếu vẫn có nhiều request đến backend cùng `Idempotency-Key` → chỉ xử lý một, các request còn lại nhận lại cùng kết quả. Hai tab dùng hai khóa khác nhau nhưng cùng giỏ hàng → hai đơn riêng, mỗi đơn vẫn kiểm tra tồn kho độc lập như E2.

---

## 9. Liên kết use case với yêu cầu (FR/NFR)

> **Quy ước mã:** `FR-01 … FR-09` là mã **đã có** trong `docs/requirements/SRS.md` (Menu và Giỏ hàng). Các nhóm yêu cầu chưa được cấp mã trong SRS (xác thực, đặt đơn, thanh toán, voucher, Loyalty, lịch sử, trạng thái đơn, tồn kho, phi chức năng) được ghi **tạm bằng mã chữ** (ví dụ `FR-PAY`, `NFR-SEC`) để không trùng số với SRS. Khi SRS được bổ sung, thay mã tạm bằng mã chính thức theo bảng 9.1.

### 9.1 Danh mục yêu cầu được tham chiếu

| Mã | Yêu cầu | Nguồn |
| :--- | :--- | :--- |
| FR-01 | Xem danh sách đồ uống | SRS 3.1.1 |
| FR-02 | Xem chi tiết sản phẩm | SRS 3.1.2 |
| FR-03 | Lựa chọn size và topping | SRS 3.1.3 |
| FR-04 | Thêm sản phẩm vào giỏ hàng | SRS 3.2.1 |
| FR-05 | Xem giỏ hàng | SRS 3.2.2 |
| FR-06 | Cập nhật số lượng sản phẩm trong giỏ hàng | SRS 3.2.3 |
| FR-07 | Xóa sản phẩm khỏi giỏ hàng | SRS 3.2.4 |
| FR-08 | Tự động tính tổng tiền giỏ hàng | SRS 3.2.5 |
| FR-09 | Hiển thị số lượng sản phẩm trên Cart Badge | SRS 3.2.6 |
| FR-AUTH *(tạm)* | Đăng ký, đăng nhập, xác thực JWT | Chờ SRS |
| FR-ORDER *(tạm)* | Tạo đơn hàng, kiểm tra và trừ tồn kho | Chờ SRS |
| FR-PAY *(tạm)* | Thanh toán Ví/Thẻ mô phỏng, xử lý lỗi, thử lại, idempotent | Chờ SRS |
| FR-VOUCHER *(tạm)* | Áp dụng voucher / mã giảm giá | Chờ SRS |
| FR-LOYALTY *(tạm)* | Tích lũy điểm Loyalty | Chờ SRS |
| FR-HISTORY *(tạm)* | Xác nhận đơn, xem trạng thái và lịch sử đơn của tôi | Chờ SRS |
| FR-STATUS *(tạm)* | Quản lý trạng thái đơn tại quầy (PAID → PREPARING → READY → COMPLETED) | Chờ SRS |
| FR-INV *(tạm)* | Quản lý danh mục và tồn kho sản phẩm | Chờ SRS |
| NFR-PERF *(tạm)* | Hiệu năng: API đặt đơn/thanh toán phản hồi ≤ 2 giây (p95) trong điều kiện thường | Chờ SRS |
| NFR-SEC *(tạm)* | Bảo mật: JWT cho route đặt đơn, mật khẩu băm, validate ở backend, không tin giá do client gửi | Chờ SRS |
| NFR-UX *(tạm)* | Tính khả dụng: mobile-first, có trạng thái loading / empty / error, thông báo lỗi dễ hiểu | Chờ SRS |
| NFR-DEPLOY *(tạm)* | Khả năng triển khai: chạy bằng Docker, cấu hình qua biến môi trường | Chờ SRS |
| NFR-REL *(tạm)* | Toàn vẹn & tin cậy: transaction khi tạo đơn/trừ kho, thanh toán idempotent, không trừ tiền trùng | Chờ SRS |

### 9.2 Ánh xạ luồng → yêu cầu → tiêu chí chấp nhận

| Luồng | FR liên quan | NFR liên quan | Tiêu chí chấp nhận (có thể dùng viết test) |
| :--- | :--- | :--- | :--- |
| **Happy Path (Bước 1–7)** | FR-01, FR-02, FR-03, FR-04, FR-05, FR-08, FR-AUTH, FR-ORDER, FR-PAY, FR-HISTORY, FR-LOYALTY | NFR-SEC, NFR-REL | **Cho** giỏ hợp lệ và đã đăng nhập, **khi** xác nhận thanh toán thành công, **thì** đơn `PAID`, có mã đơn duy nhất, tồn kho giảm đúng số lượng, giỏ rỗng, điểm Loyalty được cộng. |
| **A1 – Voucher** | FR-VOUCHER, FR-08, FR-ORDER | NFR-SEC | Voucher hợp lệ → tổng tiền = tạm tính − giảm, không âm; voucher sai/hết hạn/chưa đạt mức tối thiểu → báo lỗi và tổng tiền không đổi; backend tự tính lại tiền khi tạo đơn, bỏ qua số tiền client gửi. |
| **A2 – Đổi size/topping/xóa món** | FR-03, FR-05, FR-06, FR-07, FR-08, FR-09 | NFR-UX | Đổi size/topping → đơn giá và tổng tiền cập nhật đúng; xóa hết món → nút "Thanh toán" bị vô hiệu; voucher không còn hợp lệ sau khi đổi giỏ thì bị gỡ. |
| **A3 – Đổi phương thức trước khi xác nhận** | FR-PAY | NFR-UX | Đổi Ví ↔ Thẻ không tạo đơn và không gọi cổng thanh toán. |
| **E1 – Chưa đăng nhập / JWT hết hạn** | FR-AUTH, FR-ORDER | NFR-SEC | `POST /orders` không token hoặc token sai/hết hạn → `401`; sau đăng nhập quay lại giỏ và giỏ còn nguyên; không có đơn nào được tạo. |
| **E2 – Hết hàng** | FR-ORDER, FR-INV, FR-04, FR-06 | NFR-REL, NFR-UX | `stock` < số lượng yêu cầu → `409`, không tạo đơn, rollback; hai request tranh món cuối cùng → tối đa một đơn `PAID`, `stock` không âm. |
| **E3 – Thanh toán thất bại** | FR-PAY, FR-ORDER | NFR-REL, NFR-UX | Cổng từ chối → đơn `PAYMENT_FAILED`, tồn kho/điểm/voucher không đổi, giỏ còn nguyên; thử lại bằng khóa mới thành công → đơn `PAID`; quá 3 lần thất bại → `CANCELLED`. |
| **E4 – Mất mạng / timeout** | FR-PAY, FR-ORDER, FR-HISTORY | NFR-REL, NFR-UX | Gửi lại cùng `Idempotency-Key` → nhận cùng đơn/kết quả, chỉ **1** bản ghi thanh toán thành công; offline → nút xác nhận bị vô hiệu và hiển thị thông báo; đơn `PENDING` xem được ở lịch sử. |
| **E5 – Bấm nhiều lần** | FR-PAY, FR-ORDER | NFR-REL | Nhiều request cùng `Idempotency-Key` → 1 đơn, 1 giao dịch. |

### 9.3 Ánh xạ use case trong sơ đồ tổng quát → yêu cầu

| Use case trong `usecase-overview` | Quan hệ | Yêu cầu |
| :--- | :--- | :--- |
| Xem danh sách thực đơn | Customer → UC | FR-01 |
| Xem chi tiết & Tùy chọn (Size/Topping) | `<<include>>` Quản lý giỏ hàng | FR-02, FR-03 |
| Quản lý giỏ hàng | Customer → UC | FR-04, FR-05, FR-06, FR-07, FR-08, FR-09 |
| Đổi size / topping trong giỏ hàng | `<<extend>>` Quản lý giỏ hàng (A2) | FR-03, FR-06 |
| Đăng ký / Đăng nhập & Nhận JWT | Customer → UC; Thanh toán `<<include>>` Đăng nhập | FR-AUTH, NFR-SEC |
| Thanh toán không tiền mặt | Customer → UC; `<<include>>` Tạo đơn, Đăng nhập, Xem xác nhận; → Mock Payment Gateway | FR-PAY, FR-ORDER, NFR-REL |
| Tạo đơn hàng | `<<include>>` bởi Thanh toán | FR-ORDER |
| Áp dụng voucher | `<<extend>>` Thanh toán (A1) | FR-VOUCHER |
| Thử lại / đổi phương thức khi thanh toán lỗi | `<<extend>>` Thanh toán (E3) | FR-PAY, NFR-UX |
| Tích lũy điểm (Loyalty) | `<<extend>>` Thanh toán | FR-LOYALTY |
| Xem màn hình xác nhận đơn / Xem lịch sử đơn | Customer → UC | FR-HISTORY |
| Tiếp nhận đơn pha chế / Cập nhật pha xong & Giao khách | Barista → UC | FR-STATUS |
| Quản lý danh mục & Tồn kho sản phẩm | PO → UC | FR-INV |
