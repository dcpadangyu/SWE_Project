# ĐÁNH GIÁ VÀ RÀ SOÁT CHI TIẾT PULL REQUEST #49
> **PR #49:** `feat: tích hợp thanh toán VNPay sandbox và tự hủy đơn quá hạn`
> **Nhánh:** `VNPay` ➔ `TV1`
> **Quy mô thay đổi:** 2 commits, 40 files (+3,047 / -320 lines)
> **Mục tiêu:** Bàn giao tài liệu rà soát cho thành viên thực hiện PR để đối chiếu, hoàn thiện và khắc phục các vấn đề trước khi merge.

---

> **Cập nhật xử lý ngày 08/11/2026:** Dấu tích phản ánh thay đổi local; phần code đã commit tại `52ecff5`, chưa push. Giữ nội dung review ban đầu để đối chiếu; xem trạng thái bổ sung và checklist cuối file.

## PHẦN 1: PR #49 LÀM GÌ VÀ CHỈNH SỬA NHỮNG GÌ?

PR này chuyển đổi luồng thanh toán của ứng dụng đặt cà phê BrewLite từ **Mock Payment đồng bộ** sang **cổng thanh toán VNPay Sandbox bất đồng bộ**, đồng thời bổ sung cơ chế **hạn thanh toán 10 phút và tự động hủy đơn quá hạn**.

Cụ thể, 40 tệp thay đổi chia thành 5 nhóm chính:

### 1. Cơ sở dữ liệu & Prisma (`backend/prisma/`)
- **Schema & Migration mới** (`backend/prisma/schema.prisma`, `20261106021754_add_vnpay_payment_metadata`): Thêm 3 cột vào bảng `payments`:
  - `provider` (`String`, mặc định `"MOCK"`, nhận `"VNPAY"`)
  - `payment_url` (`TEXT`, lưu URL VNPay để phát lại khi gửi trùng Idempotency-Key hoặc mở lại từ tab khác)
  - `expires_at` (`TIMESTAMP`, thời điểm hết hạn URL thanh toán)
- **Sửa 2 file migration cũ & seed** (`20261102193258_...`, `20261103071149_...`, `backend/prisma/seed.ts`): Thay `DROP COLUMN / ADD COLUMN` bằng `RENAME COLUMN` và dùng `ALTER COLUMN ... USING` để không làm mất dữ liệu khi chạy lại trên DB đã có bảng `payments`; sửa lỗi typo `where: { email: ' ' }` thành `'customer@gmail.com'` trong `seed.ts`.

### 2. Tự động hủy đơn quá hạn 10 phút (`backend/src/orders/`)
- **Quy tắc hạn 10 phút** (`backend/src/orders/order-payment-window.ts`): Đặt `ORDER_PAYMENT_WINDOW_MS = 10 * 60 * 1000`. Hàm `expireOrderInTransaction` kiểm tra nếu đơn đang `PENDING` hoặc `PAYMENT_FAILED`, đã quá 10 phút từ `createdAt` và chưa có payment nào `SUCCESS`/`REFUNDED` thì chuyển đơn sang `CANCELLED`, đồng thời gắn `errorCode = 'ORDER_PAYMENT_EXPIRED'` vào các payment đang `PENDING` (nhưng không đổi status của payment sang `FAILED` để giữ lại đối soát).
- **Tác vụ nền & Lazy-expiration** (`backend/src/orders/order-expiration.service.ts`, `backend/src/orders/orders.service.ts`):
  - Chạy `setInterval` mỗi 15 giây (`sweep()`) quét tối đa 100 đơn quá hạn và khóa từng đơn (`SELECT ... FOR UPDATE`) để hủy.
  - Gọi hủy tức thời (lazy check) khi người dùng tạo lại đơn trùng `checkoutKey`, xem danh sách đơn (`findMyOrders`) hoặc xem chi tiết đơn (`findOneForUser`).

### 3. Phân hệ Thanh toán VNPay ở Backend (`backend/src/payments/`)
- **Tích hợp SDK `vnpay` (`^2.5.2`)** (`backend/src/payments/vnpay.service.ts`):
  - `buildPaymentUrl`: Tạo URL thanh toán VNPay với chữ ký SHA512, múi giờ `Asia/Ho_Chi_Minh`, `vnp_TxnRef = payment.id`.
  - `verifyIpn` & `verifyReturn`: Xác minh chữ ký checksum từ VNPay.
  - `queryPayment`: Gọi API `querydr` của VNPay với timeout 8 giây để đối soát giao dịch.
- **Tạo giao dịch & phát lại URL** (`backend/src/payments/vnpay-checkout.service.ts`):
  - Endpoint `POST /payments/vnpay/create`: Khóa dòng orders bằng `SELECT ... FOR UPDATE`, kiểm tra hạn 10 phút, tối đa 3 lần thử (`attemptNumber <= 3`), số tiền nguyên $\ge 5.000\text{ VND}$. Nếu đã có giao dịch `PENDING` còn hạn thì phát lại `paymentUrl` cũ thay vì tạo giao dịch mới.
- **Xử lý IPN & Return** (`backend/src/payments/vnpay-callback.service.ts`):
  - `GET /payments/vnpay/return`: Xác minh chữ ký và redirect 302 trình duyệt về `/orders/:id` trên Frontend (không cập nhật DB tại bước Return).
  - `GET /payments/vnpay/ipn`: Xác minh chữ ký, kiểm tra `vnp_TmnCode`, số tiền, khóa `SELECT ... FOR UPDATE` trên đơn hàng:
    - Nếu thành công (`00`/`00`) và đơn còn hợp lệ: Khóa `FOR UPDATE` trên voucher và từng product (sắp xếp theo `productId` chống deadlock), kiểm tra tồn kho, trừ stock, tăng version, chuyển đơn sang `PAID`, cộng `voucher.usedCount` và tích điểm `loyaltyPoints`.
    - Nếu tiền về muộn (đơn đã `CANCELLED` do quá 10 phút, hoặc hết tồn kho / hết lượt voucher): Ghi nhận `PaymentStatus.SUCCESS` nhưng gắn `errorCode = 'REFUND_REQUIRED'` và giữ đơn ở `CANCELLED` để cửa hàng hoàn tiền thủ công.
- **Đối soát giao dịch** (`backend/src/payments/vnpay-reconciliation.service.ts`):
  - Endpoint `POST /payments/vnpay/reconcile`: Khi URL cũ hết hạn hoặc bị kẹt `PENDING`, gọi `querydr` sang VNPay rồi đưa kết quả vào `confirmVerifiedPayment`.
- **Chặn Mock Payment** (`backend/src/payments/payments.controller.ts`): Khi `PAYMENT_PROVIDER=VNPAY`, endpoint `POST /payments` cũ trả về `403 Forbidden`.

### 4. Giao diện & Luồng Checkout ở Frontend (`frontend/`)
- `frontend/components/CheckoutModal.tsx`, `frontend/utils/vnpayCheckout.ts`, `frontend/utils/startVnpayPayment.ts`:
  - Lưu trạng thái tạm (`PendingCheckout`: `checkoutKey`, `paymentKey`, `fingerprint`, `cartSnapshot`) vào `sessionStorage` trước khi gọi mạng để chống mất kết nối hoặc bấm đúp.
  - Gọi `POST /orders` $\rightarrow$ `POST /payments/vnpay/create` $\rightarrow$ kiểm tra hostname `https://sandbox.vnpayment.vn` $\rightarrow$ chuyển hướng trình duyệt (`window.location.assign`). Chưa xóa giỏ hàng ngay lúc chuyển hướng.
- Trang chi tiết đơn `frontend/app/orders/[id]/page.tsx` & `frontend/components/ResumeVnpayPayment.tsx`:
  - Hiển thị đồng hồ đếm ngược 10 phút (`MM:SS`).
  - Tự động polling tối đa 10 lần (mỗi 3 giây) khi đơn đang `PENDING` (đề phòng trình duyệt Return về trước khi IPN kịp cập nhật DB).
  - Khi đơn chuyển sang `PAID`, đối chiếu `cartSnapshot` rồi mới xóa giỏ hàng.
  - Cho phép bấm **"Tiếp tục thanh toán"**, **"Thử thanh toán lại"** hoặc **"Kiểm tra trạng thái"** (gọi `reconcile`).

### 5. Tài liệu & Kiểm thử (`Docs/`, `*.spec.ts`, `*.test.mjs`)
- Thêm 5 file unit test ở Backend và 1 file test ở Frontend (`frontend/tests/vnpay-payment.test.mjs`).
- Thêm tài liệu `Docs/Huong-dan-cau-hinh-VNPAY.md` (528 dòng) hướng dẫn đăng ký VNPay Sandbox và mở Cloudflare Tunnel.

---

## PHẦN 2: NHỮNG THAY ĐỔI ĐÓ CÓ LÝ DO RÕ RÀNG KHÔNG?

**Đánh giá tổng quan:** Khoảng **85%** thay đổi trong PR có lý do kỹ thuật rất rõ ràng, sắc sảo và giải quyết đúng các bài toán khó của thanh toán bất đồng bộ, nhưng **15%** còn lại là các thay đổi ngoài phạm vi (scope creep), lệch tài liệu thiết kế hoặc tự sửa lịch sử migration tiềm ẩn rủi ro.

### ✅ Những thay đổi có lý do RẤT RÕ RÀNG và đáng khen
1. **Không cập nhật DB ở `returnUrl`, chỉ cập nhật ở IPN / `querydr`:** Người dùng có thể đóng trình duyệt trước khi redirect về, hoặc sửa tham số trên URL. Chỉ tin cậy webhook Server-to-Server (IPN) và API đối soát (`querydr`).
2. **Không xóa giỏ hàng ngay khi bấm Thanh toán:** Với VNPay, khách có thể hủy ngang hoặc thanh toán lỗi trên cổng. Giữ giỏ hàng đến khi đơn thực sự `PAID` (và chỉ xóa nếu giỏ hàng chưa bị sửa ở tab khác nhờ `cartSnapshot`) là giải pháp an toàn cho trải nghiệm người dùng.
3. **Khóa `SELECT ... FOR UPDATE` theo thứ tự và xử lý `REFUND_REQUIRED`:** Trong thanh toán bất đồng bộ, từ lúc tạo đơn đến lúc khách trả tiền xong có thể cách nhau vài phút — lúc đó sản phẩm có thể đã hết hàng hoặc đơn vừa bị hủy quá hạn ở giây thứ 600. Việc ghi nhận `PaymentStatus.SUCCESS` kèm `errorCode: 'REFUND_REQUIRED'` thay vì làm crash IPN là hoàn toàn chính xác.
4. **Không tự tạo lượt thanh toán mới khi lượt cũ còn `PENDING`:** Buộc phải phát lại URL cũ (nếu còn hạn) hoặc gọi `reconcile` (`querydr`) xác nhận lượt cũ đã `FAILED` rồi mới cho tạo `attemptNumber` tiếp theo, tránh việc khách bị trừ tiền 2 lần ở 2 tab.

### ❓ Những thay đổi KHÔNG RÕ LÝ DO, LỆCH SPEC hoặc KHÔNG NÊN CÓ trong PR này
1. **Bật `experimental.agentFeedback: true` và commit domain tunnel cá nhân vào `frontend/next.config.ts` & `frontend/AGENTS.md`:**
   - Trong `next.config.ts` có hardcode `'level-answered-maple-dominant.trycloudflare.com'` (URL Quick Tunnel ngẫu nhiên chỉ sống trong 1 phiên chạy máy của tác giả) và bật `experimental.agentFeedback: true` làm sinh ra đoạn hướng dẫn gửi telemetry trong `frontend/AGENTS.md`. Thay đổi này không phục vụ tính năng VNPay.
2. **Hạn thanh toán là 10 phút thay vì 15 phút như ADR-003:**
   - Tài liệu kiến trúc `003-state-machine.md` quy định rõ: `PENDING --> CANCELLED: Khách hủy đơn / Quá hạn 15 phút`. PR đổi thành 10 phút (`ORDER_PAYMENT_WINDOW_MS = 10 * 60 * 1000`) nhưng không cập nhật `ADR-003`, gây mâu thuẫn giữa code và tài liệu kiến trúc của nhóm.
3. **Sửa nội dung 2 file migration cũ đã commit vào nhánh chính:**
   - Tác giả ghi chú trong PR description là *"có chỉnh hai migration cũ"*. Lý do là 2 migration cũ trên nhánh gốc dùng `DROP COLUMN / ADD COLUMN` làm mất dữ liệu hoặc xung đột với bảng `payments`. Tuy nhiên, việc sửa trực tiếp file `.sql` của migration cũ sẽ làm lệch checksum trong bảng `_prisma_migrations` của các thành viên khác đã từng chạy migrate trước đó.

---

## PHẦN 3: KẾT QUẢ KIỂM TRA (2 TRỤC SONG SONG: TIÊU CHUẨN & ĐẶC TẢ)

### Trục 1: Tiêu chuẩn mã nguồn & Mùi mã nguồn (Standards)

#### 1. Vi phạm quy chuẩn đã tài liệu hóa của Repo
- **Quy ước Git Commit (`ed5fe00`, `44ea109`):**
  - *Quy chuẩn (`Docs/Hướng dẫn đọc code và tích hợp.md`):* Bắt buộc dùng tiền tố `[Feat]:`, `[Docs]:`, `[Fix]:`...
  - *Vi phạm:* 2 commit trong PR dùng `feat: ...` và `docs: ...`.
- **Đồng bộ Hợp đồng kiểu dữ liệu (`brewlite.ts`):**
  - *Quy chuẩn (`Docs/Hướng dẫn đọc code và tích hợp.md`):* `frontend/types/brewlite.ts` và `backend/src/common/types/brewlite.ts` phải đồng bộ 100%.
  - *Vi phạm:* `frontend/types/brewlite.ts` được thêm `paymentExpiresAt?: string`, nhưng `backend/src/common/types/brewlite.ts` hoàn toàn không được cập nhật (thiếu cả `paymentExpiresAt` trên `Order` lẫn `provider`, `paymentUrl`, `expiresAt` trên `Payment`).
- **Quy chuẩn Order State Machine (`ADR-003`):**
  - *Quy chuẩn (`Docs/architecture/adr/003-state-machine.md`):* Hạn thanh toán là 15 phút; trạng thái `PAYMENT_FAILED` chỉ chuyển sang `CANCELLED` khi *"Khách chọn hủy / Quá 3 lần thử"*.
  - *Vi phạm:* `order-payment-window.ts` đặt hạn 10 phút và tự hủy theo thời gian cả đơn đang ở `PAYMENT_FAILED`.

#### 2. Mùi mã nguồn (Code Smells cần lưu ý)
- **Duplicated Code (Trùng lặp logic nghiệp vụ):**
  - Trong `backend/src/payments/vnpay-callback.service.ts` (L314–438): Logic gom số lượng sản phẩm, trừ stock kèm tăng version, và tính điểm thưởng (`Math.floor(payment.amount.toNumber() / 10000)`) bị viết lặp lại thay vì tái sử dụng `PaymentsService` và `PromotionsService.addLoyaltyPoints`.
  - Trong `vnpay.controller.ts` (L62–72 & L86–87): Biểu thức chuẩn hóa IP `(req.ip || req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '')` lặp lại ở 2 endpoint.
  - Trong `vnpay-reconciliation.service.ts` (L24–28) và `vnpay-checkout.service.ts` (L30–49): Điều kiện kiểm tra một payment `PENDING` còn khả dụng bị viết lặp ở 2 nơi.
- **Primitive Obsession:** Dùng kiểu `String` tự do cho `Payment.provider` (`"MOCK"` | `"VNPAY"`) và `ReconciliationResult.status: string` thay vì Enum chặt chẽ.

---

### Trục 2: Đối chiếu Đặc tả Yêu cầu SRS & Mục tiêu PR (Spec)

#### (a) Yêu cầu trong SRS bị thiếu hoặc bị làm mất
1. **Mất tùy chọn phương thức thanh toán trên UI & gán cứng `BANK_CARD` (FR-13 / AC-13.1):**
   - *Trích dẫn SRS (`Docs/requirements/SRS.md:282`):* *"AC-13.1: Khi giỏ hàng có ít nhất 1 sản phẩm → giao diện hiển thị tổng số tiền cần thanh toán và cho phép khách hàng lựa chọn phương thức thanh toán không tiền mặt (Ví điện tử hoặc Thẻ ngân hàng)."*
   - *Phát hiện:* `CheckoutModal.tsx` đã xóa hoàn toàn nút chọn `E_WALLET` / `BANK_CARD`, còn `VnpayCheckoutService` (L213) gán cứng `paymentMethod: PaymentMethod.BANK_CARD`.
2. **Vô hiệu hóa luồng Mock Payment mặc định (FR-13):**
   - *Trích dẫn SRS (`Docs/requirements/SRS.md:279`):* *"Cho phép khách hàng thanh toán đơn hàng bằng Ví điện tử hoặc Thẻ ngân hàng qua cổng thanh toán mô phỏng (Mock Payment)."*
   - *Phát hiện:* `backend/.env.example` đặt mặc định `PAYMENT_PROVIDER=VNPAY` khiến `POST /payments` ném lỗi `403 Forbidden`. Nếu người kiểm tra chạy local chưa có tài khoản VNPay Sandbox và chưa bật Cloudflare Tunnel, chức năng thanh toán sẽ không chạy được.

#### (b) Hành vi ngoài phạm vi yêu cầu (Scope Creep)
1. Sửa lịch sử 2 file Prisma migration cũ & `seed.ts` không nằm trong yêu cầu tính năng VNPay.
2. Bật `experimental.agentFeedback` trong `next.config.ts` và thêm chỉ dẫn telemetry vào `frontend/AGENTS.md`.

#### (c) Yêu cầu đã cài đặt nhưng logic xử lý chưa trọn vẹn
1. **Giỏ hàng không được dọn trống nếu khách hoàn tất/xem đơn ở tab khác (AC-13.2):**
   - *Trích dẫn SRS (`Docs/requirements/SRS.md:283`):* *"AC-13.2: Khi thanh toán thành công → ... dọn trống giỏ hàng trên giao diện."*
   - *Phát hiện:* Giỏ hàng lưu trong `localStorage` (Zustand), nhưng `completePaidCheckout` (`frontend/utils/vnpayCheckout.ts:L55-73`) lại kiểm tra `sessionStorage` (`brewlite_vnpay_checkout:${userId}`). Vì `sessionStorage` không chia sẻ giữa các tab hoặc bị mất khi mở lại trình duyệt từ lịch sử đơn hàng (`ResumeVnpayPayment`), giỏ hàng sẽ không được xóa trong các trường hợp đó.

---

## PHẦN 4: ĐÁNH GIÁ CHUYÊN SÂU BẰNG SKILL
*(Góc nhìn thực tế: Tính đúng đắn, An toàn dữ liệu, Chịu tải và Tinh gọn)*

### 🚨 Must fix (Bắt buộc sửa trước khi Merge — Tránh lỗi logic & rủi ro mất tiền)

#### 1. Khách thanh toán qua `ResumeVnpayPayment` bị tính tiền cho đơn ĐÃ HỦY nếu bấm ở phút thứ 9

> **Trạng thái cập nhật:** ✅ Đã xử lý theo vnp_PayDate đã xác minh: thanh toán đúng hạn nhưng IPN trễ có thể được xác nhận/khôi phục đơn tự hủy khi đủ điều kiện; thanh toán thực sự quá hạn vẫn cần đối soát hoàn tiền. Có test hồi quy.

- **Vị trí:** `backend/src/payments/vnpay-checkout.service.ts:L193` & `vnpay-callback.service.ts:L163`
- **Vấn đề:** Khi tạo lượt thanh toán VNPay mới (ví dụ lần thử thứ 2 ở phút thứ 9 sau khi tạo đơn), `VnpayCheckoutService` đặt `expiresAt = orderPaymentDeadline(order.createdAt)` (tức chỉ còn 1 phút là hết hạn). Cổng VNPay và ngân hàng thường mất 1–3 phút để khách quét QR/OTP và để VNPay bắn IPN về. Đúng lúc 10:00, cronjob hoặc chính lệnh `expireOrderInTransaction(tx, order)` trong `VnpayCallbackService` (dòng 163) sẽ hủy đơn (`CANCELLED`) ngay trước khi xử lý IPN, biến giao dịch thành công thành `REFUND_REQUIRED` (khách bị trừ tiền nhưng đơn lại bị hủy).
- **Cách sửa:** Trong `VnpayCallbackService.confirmVerifiedPayment`, nếu `succeeded === true` (VNPay xác nhận đã thu tiền hợp lệ), **không được gọi `expireOrderInTransaction(tx, order)`** để tự hủy đơn đang `PENDING` trước khi giao hàng; hoặc phải có thời gian ân hạn (grace period) cho các giao dịch đã mở cổng thanh toán trước hạn.
- **Hệ quả nếu bỏ qua:** Khách thanh toán ở phút thứ 8–9, hoàn tất lúc 10:05 sẽ bị trừ tiền mà đơn vẫn báo hủy.

#### 2. Frontend khóa cứng hostname `sandbox.vnpayment.vn` và Backend khóa cứng `testMode: true`

> **Trạng thái cập nhật:** ✅ Đã cấu hình origin HTTPS được phép ở FE và VNPAY_TEST_MODE/VNPAY_HOST/VNPAY_QUERY_HOST ở BE. Có test cấu hình và URL không hợp lệ.

- **Vị trí:** `frontend/utils/startVnpayPayment.ts:L40-41`, `backend/src/payments/vnpay.service.ts:L40`
- **Vấn đề:** Hàm `startVnpayPayment` ở FE kiểm tra `destination.hostname !== 'sandbox.vnpayment.vn'` trước khi chuyển hướng. Nếu Backend đổi `VNPAY_HOST` sang môi trường khác hoặc mock server khi chạy E2E test, Frontend sẽ ném lỗi *"Địa chỉ cổng thanh toán không hợp lệ"*.
- **Cách sửa:** So sánh `destination.origin` với biến môi trường hoặc tin tưởng URL từ API Backend đã xác thực JWT (chỉ kiểm tra `destination.protocol === 'https:'`).
- **Hệ quả nếu bỏ qua:** Phải sửa code mỗi khi muốn đổi host hoặc test môi trường khác ngoài sandbox.

#### 3. Sửa trực tiếp 2 file Prisma Migration cũ gây lỗi `checksum mismatch`

> **Trạng thái cập nhật:** ⚠️ Đã ghi hướng dẫn đối chiếu và reset CHỈ cho DB local thử nghiệm được phép mất dữ liệu trong Docs/Kiem-tra-migration-VNPAY.md và hướng dẫn VNPay. Chưa gửi thông báo hoặc xác nhận lịch sử DB của từng thành viên. DB brewlite_test đã migrate thành công, không reset; chưa coi tương thích mọi DB là hoàn tất.

- **Vị trí:** `backend/prisma/migrations/20261102193258_.../migration.sql`, `20261103071149_.../migration.sql`
- **Vấn đề:** Prisma lưu mã băm SHA-256 của từng file migration trong bảng `_prisma_migrations`. Bất kỳ thành viên nào đã chạy `prisma migrate dev` trước đây khi pull nhánh này về sẽ bị lỗi *"The migration ... was modified after it was applied"* và buộc phải reset database (`prisma migrate reset`).
- **Cách sửa:** Giữ nguyên migration cũ nếu đã đồng bộ với các thành viên khác, hoặc phải ghi chú thông báo rõ ràng cho cả nhóm chạy lệnh `npx prisma migrate reset` sau khi pull.
- **Hệ quả nếu bỏ qua:** Các thành viên khác bị kẹt lệnh migrate khi cập nhật code mới.

---

### ⚠️ Should fix (Nên tối ưu — Hiệu năng & Khả năng bảo trì)

#### 4. Vòng lặp N+1 Transaction khi tự hủy đơn quá hạn

> **Trạng thái cập nhật:** ✅ Đã bỏ expireDueOrders khỏi findMyOrders (GET /orders/me), giữ tác vụ nền và kiểm tra hạn ở chi tiết/thanh toán. Có test hồi quy.

- **Vị trí:** `backend/src/orders/order-expiration.service.ts:L43-53`
- **Vấn đề:** `expireDueOrders(userId)` được gọi mỗi khi khách truy cập danh sách đơn hàng (`GET /orders`). Nếu user có 50 đơn quá hạn, 1 request `GET /orders` sẽ mở tuần tự 50 database transactions kèm 150 câu query riêng lẻ.
- **Cách sửa:** Vì đã có background timer quét định kỳ 15 giây (`onModuleInit`), trong `findMyOrders` nên bỏ lệnh `expireDueOrders(userId)` (chỉ giữ `expireOrder(orderId)` ở `GET /orders/:id` và `POST /payments/vnpay/create`).
- **Hệ quả nếu bỏ qua:** API `GET /orders` bị chậm (dễ vượt mốc 500ms quy định trong NFR-01).

#### 5. Trùng lặp logic trừ kho & tích điểm thưởng ở 2 nơi

> **Trạng thái cập nhật:** ✅ Mock và VNPay dùng chung fulfillPaidOrderInTransaction, dùng voucher và cộng điểm cùng transaction thanh toán. Lỗi ghi dữ liệu phải rollback; nhánh cần hoàn tiền được phân loại trước khi thay đổi kho/voucher/điểm. Có test hồi quy.

- **Vị trí:** `backend/src/payments/vnpay-callback.service.ts:L314-438` vs `payments.service.ts` & `promotions.service.ts`
- **Vấn đề:** Khi IPN báo thanh toán thành công, `VnpayCallbackService` tự viết lại toàn bộ code gom nhóm `order.items`, trừ kho, tăng `voucher.usedCount` và tính điểm thưởng thay vì gọi service dùng chung.
- **Cách sửa:** Đóng gói phần hoàn tất đơn hàng (`fulfillPaidOrderInTransaction`) thành một hàm dùng chung cho cả `PaymentsService` và `VnpayCallbackService`.
- **Hệ quả nếu bỏ qua:** Dễ bị lệch logic giữa thanh toán Mock và thanh toán VNPay khi nâng cấp hệ thống.

#### 6. Rò rỉ cấu hình máy cá nhân và telemetry

> **Trạng thái cập nhật:** ✅ Đã bỏ domain tunnel dự phòng ghi cứng, chỉ thêm DEV_TUNNEL_HOST khi có giá trị; tắt agentFeedback và gỡ block feedback tự sinh trong AGENTS.md. agentFeedback đã tồn tại trước nhánh VNPay.

- **Vị trí:** `frontend/next.config.ts` & `frontend/AGENTS.md`
- **Vấn đề:** `next.config.ts` chứa tên miền tunnel cá nhân tạm thời `'level-answered-maple-dominant.trycloudflare.com'` và `experimental: { agentFeedback: true }`.
- **Cách sửa:** Chỉ thêm `process.env.DEV_TUNNEL_HOST` vào `allowedDevOrigins` khi có giá trị (`...(process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : [])`) và hoàn nguyên `frontend/AGENTS.md`.

---

## 💡 KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG

- **Đánh giá chung:** PR có chất lượng tư duy xử lý bất đồng bộ tốt, kiểm soát chặt chẽ race-condition và có test case phong phú.
- **Checklist công việc cần bạn phụ trách PR hoàn thiện (cập nhật 08/11/2026):**
  - [x] **Sửa lỗi hết hạn khi IPN về trễ:** Xử lý theo thời điểm thanh toán đã xác minh; giữ hạn 10 phút và nhánh đối soát/hoàn tiền khi cần.
  - [x] **Đồng bộ tài liệu ADR-003:** Hạn 10 phút, hết hạn cho PAYMENT_FAILED và ngoại lệ đối soát đơn tự hủy.
  - [x] **Cập nhật types dùng chung:** Đồng bộ BE/FE; bổ sung PaymentProvider, provider, paymentUrl, expiresAt, updatedAt và paymentExpiresAt.
  - [x] **Dọn dẹp file cấu hình:** Gỡ domain tunnel cá nhân, tắt agentFeedback và bỏ block feedback tự sinh trong AGENTS.md.
  - [x] **Môi trường mặc định:** File mẫu dùng MOCK; FE tự lấy provider từ BE; chặn tạo giao dịch sai chế độ và Mock trong production. VNPay cũ vẫn nhận callback/đối soát.
  - [ ] **Thông báo cho nhóm:** Đã ghi hướng dẫn migration/reset có điều kiện; chưa gửi thông báo và chưa xác nhận DB từng thành viên. Không yêu cầu reset DB dùng chung hoặc cần giữ dữ liệu.

### Các mục bổ sung trong toàn bộ review

- [x] Bỏ quét hủy đơn hàng loạt khỏi API lịch sử.
- [x] Dùng chung logic kho/voucher/điểm giữa Mock và VNPay, cùng transaction.
- [x] Sửa môi trường E2E: áp dụng 4 migration còn thiếu trên brewlite_test, thêm pretest:e2e và kiểm tra chống nhầm DB; đã ghi hướng dẫn.
- [ ] Khôi phục/làm rõ lựa chọn ví điện tử và thẻ theo AC-13.1; hiện vẫn gán BANK_CARD.
- [ ] Dọn giỏ khi thanh toán/xem kết quả ở tab khác hoặc mở lại trình duyệt.
- [ ] Gom biểu thức chuẩn hóa IP và điều kiện kiểm tra payment còn bị lặp.
- [ ] Siết ReconciliationResult.status và provider trong Prisma; PaymentProvider ở types BE/FE đã bổ sung nhưng schema vẫn là String.
- [ ] Xác nhận build FE đầy đủ: còn vướng Turbopack khi xử lý CSS.
- [ ] Chạy lại thanh toán VNPay sandbox thủ công trên FE sau toàn bộ thay đổi.
- [x] Commit phần code/cấu hình/test tại `52ecff5` với tiền tố `fix:`; file Markdown được tách sang commit `doc:` theo yêu cầu hiện tại. Không viết lại hai commit cũ.
- [ ] Push các commit mới lên GitHub.

### Kết quả kiểm tra đã chạy

- [x] Test BE: 290 test đạt, gồm logic, API phân luồng và bảo vệ môi trường E2E.
- [x] E2E API: 4/4 đạt sau khi đồng bộ DB test; chưa phải E2E trình duyệt qua cổng VNPay.
- [x] Test logic thanh toán FE: 28 test đạt.
- [x] TypeScript BE/FE, lint các file thay đổi và build BE đạt.
- [ ] Build FE đầy đủ và test VNPay sandbox thủ công sau các thay đổi: chưa xác nhận đạt.
