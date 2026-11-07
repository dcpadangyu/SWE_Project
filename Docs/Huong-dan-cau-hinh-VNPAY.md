# Hướng dẫn cấu hình và chạy thử VNPay Sandbox — BrewLite

Cập nhật: 06/11/2026. Hướng dẫn này áp dụng cho code hiện tại trong repository, chạy bằng PowerShell trên Windows. Backend dùng NestJS + Prisma; frontend dùng Next.js; PostgreSQL chạy qua Docker.

Các giá trị `BACKEND-TUNNEL`, `FRONTEND-TUNNEL`, `TMN_CODE_CUA_BAN` và `HASH_SECRET_CUA_BAN` bên dưới là chỗ cần thay, không phải thông tin có thể dùng nguyên mẫu.

## 1. Chọn cách chạy

| Cách test | Frontend | Backend | Tunnel cần bật |
| --- | --- | --- | --- |
| Test trên chính máy lập trình — nên bắt đầu bằng cách này | `http://localhost:3000` | `http://localhost:8080` | Tunnel backend để nhận IPN |
| Test trên điện thoại hoặc chia sẻ trang cho người khác | URL HTTPS tunnel frontend | URL HTTPS tunnel backend | Cả hai tunnel |

Luồng thanh toán hiện tại:

1. FE gửi giỏ hàng tới `POST /orders` để lấy `orderId`.
2. FE gọi `POST /payments/vnpay/create`, kèm JWT và `Idempotency-Key`.
3. BE trả `paymentUrl`; FE chuyển trình duyệt tới URL này.
4. VNPay gửi thông báo IPN tới BE để ghi nhận kết quả thanh toán.
5. VNPay đưa trình duyệt về endpoint return của BE; BE chuyển tiếp tới trang đơn hàng của FE.
6. FE đọc trạng thái đơn từ BE. Việc trình duyệt quay về không tự chứng minh đơn đã được thanh toán.

FE đã có phần kết nối VNPay trong `components/CheckoutModal.tsx`, `components/ResumeVnpayPayment.tsx` và `utils/startVnpayPayment.ts`; không cần tự ghép URL thanh toán trên FE.

## 2. Chuẩn bị thông tin merchant

Đăng ký merchant sandbox theo hướng dẫn VNPay và lấy thông tin được cấp:

- **TmnCode / Terminal Code:** mã merchant.
- **Hash Secret / Secure Secret:** khóa ký dữ liệu VNPay.
- Tài khoản đăng nhập trang quản lý merchant sandbox.

`VNPAY_HASH_SECRET` phải là secret VNPay cấp. Mật khẩu đăng nhập merchant, `JWT_SECRET` và khóa Windows là những thông tin khác nhau.

Code hiện tại đọc secret từ biến môi trường `VNPAY_HASH_SECRET`. Chưa có chức năng tự đọc Windows Credential Manager hoặc tự giải mã file secret trong một thư mục.

Kiểm tra công cụ đã cài:

```powershell
node --version
npm --version
docker --version
cloudflared --version
```

Nếu PowerShell chưa nhận `cloudflared`, cài hoặc thêm công cụ vào PATH theo tài liệu Cloudflare, rồi mở PowerShell mới.

## 3. Mở PostgreSQL và chuẩn bị dependency

Mở Docker Desktop, đợi Docker sẵn sàng. Trong PowerShell:

```powershell
Set-Location 'D:\Software_engine\SWE_Project'
docker compose up -d db
docker ps --filter 'name=brewlite-db'
```

Container `brewlite-db` cần ở trạng thái chạy; đợi healthcheck báo `healthy`.

Nếu vừa clone project hoặc chưa cài dependency, chạy lần lượt:

```powershell
Set-Location 'D:\Software_engine\SWE_Project\backend'
npm ci
```

```powershell
Set-Location 'D:\Software_engine\SWE_Project\frontend'
npm ci
```

Nếu dependency đã cài đầy đủ thì bỏ qua hai lệnh `npm ci`. Package `vnpay` đã có trong backend.

## 4. Hai đoạn PowerShell để bật Cloudflare

Hai lệnh này chạy ở **hai terminal riêng**. Nếu `cloudflared` đã có trong PATH, thư mục hiện tại không ảnh hưởng tới lệnh.

### Terminal tunnel backend — cổng 8080

```powershell
Set-Location 'D:\Software_engine\SWE_Project'
cloudflared tunnel --url http://localhost:8080
```

Ghi lại URL HTTPS được in ra, ví dụ:

```text
https://BACKEND-TUNNEL.trycloudflare.com
```

### Terminal tunnel frontend — cổng 3000, chỉ cần khi dùng FE công khai

```powershell
Set-Location 'D:\Software_engine\SWE_Project'
cloudflared tunnel --url http://localhost:3000
```

Ghi lại URL HTTPS được in ra, ví dụ:

```text
https://FRONTEND-TUNNEL.trycloudflare.com
```

Giữ terminal tunnel cần dùng chạy trong suốt buổi test. `Ctrl + C` sẽ dừng tunnel. Quick Tunnel cấp URL tạm thời; khi chạy lại phải kiểm tra URL và cập nhật cấu hình nếu URL đã đổi. Xem [tài liệu Quick Tunnels của Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Có thể mở tunnel trước khi ứng dụng khởi động để lấy URL điền vào `.env`; truy cập tunnel chỉ hoạt động khi dịch vụ tại cổng tương ứng đã chạy.

## 5. Cấu hình backend/.env

Mở file `backend/.env`. Nếu chưa có file thì tạo từ `backend/.env.example`; nếu đã có thì sửa các dòng liên quan, giữ lại cấu hình DB và JWT đang dùng. Mỗi tên biến chỉ nên có một dòng trong file.

### Cách A — frontend chạy localhost

```dotenv
PORT=8080
DATABASE_URL=postgresql://admin:admin111@localhost:5432/brewlite_db?schema=public
JWT_SECRET=THAY_BANG_JWT_SECRET_RIENG_CUA_UNG_DUNG

PAYMENT_PROVIDER=VNPAY
VNPAY_TMN_CODE=TMN_CODE_CUA_BAN
VNPAY_HASH_SECRET=HASH_SECRET_CUA_BAN
VNPAY_HOST=https://sandbox.vnpayment.vn

VNPAY_RETURN_URL=https://BACKEND-TUNNEL.trycloudflare.com/payments/vnpay/return
VNPAY_IPN_URL=https://BACKEND-TUNNEL.trycloudflare.com/payments/vnpay/ipn

FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

Ví dụ DB ở trên khớp giá trị mặc định của `docker-compose.yml`. Nếu đã đổi user, password hoặc cổng DB, giữ chuỗi kết nối thực tế của bạn. Giữ nguyên `JWT_SECRET` đang sử dụng nếu không có nhu cầu đổi khóa đăng nhập.

### Cách B — frontend truy cập bằng tunnel

Giữ nhóm cấu hình VNPay như cách A, thay hai dòng sau:

```dotenv
FRONTEND_URL=https://FRONTEND-TUNNEL.trycloudflare.com
CORS_ORIGIN=http://localhost:3000,https://FRONTEND-TUNNEL.trycloudflare.com
```

`FRONTEND_URL` chỉ chứa **một** địa chỉ FE để BE chuyển hướng sau thanh toán. `CORS_ORIGIN` có thể chứa nhiều origin, ngăn bằng dấu phẩy, không kèm đường dẫn hoặc dấu `/` cuối. Khi có `CORS_ORIGIN`, backend ưu tiên biến này thay vì dùng `FRONTEND_URL` làm danh sách CORS.

### Phân biệt các URL

| Giá trị | Dùng để làm gì? | Điền ở đâu? |
| --- | --- | --- |
| `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` | Trang cổng thanh toán TEST do VNPay cung cấp, thường được gọi là `vnp_Url` | SDK tự sử dụng endpoint; không điền URL này vào `FRONTEND_URL` hay `VNPAY_RETURN_URL` |
| `https://sandbox.vnpayment.vn` | Host gốc của VNPay | `VNPAY_HOST` trong BE |
| `https://BACKEND-TUNNEL.trycloudflare.com/payments/vnpay/return` | Nhận trình duyệt quay về | `VNPAY_RETURN_URL` trong BE |
| `https://BACKEND-TUNNEL.trycloudflare.com/payments/vnpay/ipn` | Nhận thông báo kết quả server-to-server | Cấu hình IPN trên trang merchant VNPay |
| `http://localhost:3000` hoặc tunnel FE | Trang khách quay về để xem đơn | `FRONTEND_URL` trong BE |

**Lưu ý với code hiện tại:** `VNPAY_IPN_URL` trong `.env` là dòng lưu thông tin cấu hình để dễ theo dõi. Code chưa dùng biến này để tự đăng ký IPN với VNPay. Bạn vẫn phải thực hiện bước 7 trên trang merchant.

Không đưa `VNPAY_HASH_SECRET` vào FE hoặc biến có tiền tố `NEXT_PUBLIC_`. Không commit file `.env` thật lên GitHub; tài liệu này chỉ dùng placeholder.

## 6. Cấu hình frontend/.env.local

Nếu test FE trên chính máy lập trình:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Nếu mở FE bằng tunnel, dùng bộ cấu hình sau để cả điện thoại và máy khác gọi được BE:

```dotenv
NEXT_PUBLIC_API_URL=https://BACKEND-TUNNEL.trycloudflare.com
DEV_TUNNEL_HOST=FRONTEND-TUNNEL.trycloudflare.com
```

- `NEXT_PUBLIC_API_URL` là địa chỉ **backend**, không phải địa chỉ FE hoặc cổng VNPay. Không thêm `/payments/vnpay/create` vào biến này.
- `DEV_TUNNEL_HOST` chỉ là hostname của **frontend tunnel**, không có `https://`, cổng hoặc đường dẫn. `next.config.ts` dùng biến này để cho phép dev server/HMR nhận origin của tunnel.
- Khi FE mở qua HTTPS hoặc trên điện thoại, cấu hình API là `http://localhost:8080` sẽ không phù hợp: localhost trỏ tới thiết bị đang mở trình duyệt và còn có thể bị chặn do mixed content.

Lưu file và khởi động lại frontend sau khi đổi các biến này. Với bản production build, thay `NEXT_PUBLIC_API_URL` thì cần build lại FE; hướng dẫn này tập trung vào dev local.

## 7. Đăng ký IPN URL trên merchant VNPay

1. Đăng nhập trang merchant sandbox bằng tài khoản được VNPay cấp.
2. Mở **Cấu hình IPN URL**.
3. Chọn dòng có Terminal Code khớp `VNPAY_TMN_CODE`.
4. Bấm **Sửa**, điền:

   ```text
   https://BACKEND-TUNNEL.trycloudflare.com/payments/vnpay/ipn
   ```

5. Bấm **Cập nhật** và kiểm tra URL đã lưu.

Không dùng tunnel FE hoặc `localhost` làm IPN URL. VNPay phải gọi được endpoint BE từ bên ngoài máy bạn. Vai trò IPN và return được mô tả trong [tài liệu tích hợp VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

## 8. Đồng bộ Prisma và mở ứng dụng

Khi mới lấy code hoặc có migration mới, chạy trong backend khi DB đã sẵn sàng:

```powershell
Set-Location 'D:\Software_engine\SWE_Project\backend'
npm run prisma:generate
npx prisma migrate deploy
```

Nếu project đã đồng bộ schema thì không cần lặp lại các lệnh Prisma mỗi lần test. Nếu generate báo lỗi `EPERM` với `query_engine-windows.dll.node`, dừng backend đang sử dụng Prisma bằng `Ctrl + C`, chạy lại generate, rồi mở backend lại. Không cần dừng tunnel chỉ để generate Prisma.

### Terminal chạy backend

```powershell
Set-Location 'D:\Software_engine\SWE_Project\backend'
npm run start:dev
```

### Terminal chạy frontend

```powershell
Set-Location 'D:\Software_engine\SWE_Project\frontend'
npm run dev
```

Tổng cộng thường có 3 terminal: BE, FE và tunnel BE. Nếu dùng cả tunnel FE thì có 4 terminal. Lệnh Cloudflare chỉ mở tunnel, không tự khởi chạy ứng dụng.

Sau khi sửa `.env` BE, dùng `Ctrl + C` tại terminal BE rồi chạy lại `npm run start:dev`. Làm tương tự với FE sau khi sửa `.env.local`. Giữ các tunnel đang dùng chạy để tránh đổi URL.

## 9. Kiểm tra trước khi thanh toán

Mở các địa chỉ sau:

- API local: `http://localhost:8080/products` — phải nhận được JSON.
- Swagger: `http://localhost:8080/swagger`.
- FE local: `http://localhost:3000`.
- Backend công khai: `https://BACKEND-TUNNEL.trycloudflare.com/products` — phải nhận được JSON.
- Nếu dùng FE công khai: mở URL tunnel FE và kiểm tra menu tải được.

Có thể thử endpoint IPN bằng trình duyệt, không kèm query:

```text
https://BACKEND-TUNNEL.trycloudflare.com/payments/vnpay/ipn
```

Code hiện tại trả:

```json
{
  "RspCode": "97",
  "Message": "Invalid request"
}
```

Kết quả này chỉ cho biết endpoint có phản hồi và đang từ chối request thiếu tham số. Đây không phải xác nhận một giao dịch đã được xử lý đúng. Endpoint return khi mở trống cũng có thể báo 400 vì thiếu query/chữ ký.

## 10. Test bằng Swagger

1. Đăng ký hoặc đăng nhập tài khoản bằng các API `/auth` hiện có.
2. Lấy `accessToken`, bấm **Authorize** và nhập token vào trường Bearer theo giao diện Swagger.
3. Gọi `GET /products`, chọn món đang mở bán và đủ tồn kho.
4. Gọi `POST /orders` bằng giỏ hàng hợp lệ, ví dụ:

   ```json
   {
     "items": [
       {
         "productId": "UUID_SAN_PHAM_TU_API_PRODUCTS",
         "size": "M",
         "quantity": 1,
         "toppingIds": []
       }
     ],
     "note": "Test VNPay Sandbox"
   }
   ```

5. Lấy `orderId` trong response. Không nhầm với mã hiển thị như `#3`.
6. Gọi `POST /payments/vnpay/create`:
   - Header `Idempotency-Key`: một UUID mới cho lượt thanh toán này. Có thể tạo bằng `[guid]::NewGuid().ToString()` trong PowerShell.
   - Body:

     ```json
     {
       "orderId": "UUID_DON_HANG_VUA_TAO"
     }
     ```

7. API hiện trả HTTP 200 và `paymentUrl`. Copy **toàn bộ URL**, mở trong trình duyệt để thanh toán. Swagger không tự chuyển trình duyệt sang VNPay.
8. Dùng thông tin thanh toán test lấy từ tài liệu hoặc hướng dẫn sandbox VNPay tương ứng với phương thức đã chọn.
9. Sau khi quay về FE, kiểm tra đơn. Gọi thêm `GET /orders/{id}` để xác nhận trạng thái từ DB đã thành `PAID`.

Gửi lại cùng `Idempotency-Key` để kiểm tra phản hồi của cùng lượt; không đổi khóa chỉ vì mất response. Code hiện tại giới hạn tối đa 3 lượt thanh toán mỗi đơn, số tiền nguyên VND tối thiểu 5.000 đồng. Hạn thanh toán là **10 phút từ lúc tạo đơn**, thử lại không kéo dài hạn này. URL VNPay mới hết hạn cùng mốc của đơn.

## 11. Test từ frontend

1. Mở FE theo cách A hoặc B đã chọn ở trên.
2. Đăng nhập tài khoản của bạn.
3. Chọn món thực tế từ menu → thêm vào giỏ hàng.
4. Mở giỏ hàng → **Thanh toán** → **Tiếp tục với VNPay**.
5. FE phải chuyển sang trang `sandbox.vnpayment.vn`.
6. Hoàn tất thanh toán sandbox. Sau return, kiểm tra trang đơn hàng và trạng thái `PAID`.

Để kiểm tra nối FE–BE bằng DevTools, mở **Network**, bấm thanh toán và tìm:

| Request | Kết quả cần thấy |
| --- | --- |
| `POST /orders` | 201 khi tạo mới hoặc 200 khi gửi lại; response có `orderId` |
| `POST /payments/vnpay/create` | 200; response có `paymentUrl` |
| Trang VNPay | Trình duyệt chuyển sang URL nhận từ response |

FE gửi JWT trong header `Authorization` và khóa chống trùng trong `Idempotency-Key`. API `/payments/vnpay/create` trả JSON chứa URL, không trả redirect HTTP để Swagger hay `fetch` tự mở trang.

Khi BE trả 409 do giao dịch cũ, FE mới gọi `POST /payments/vnpay/reconcile` để xác minh. Nút **Kiểm tra trạng thái** ở chi tiết đơn cũng gọi API này.

FE lưu lượt checkout đang chờ bằng `sessionStorage`, theo tài khoản. Khi quay lại một lượt đang chờ, ứng dụng có thể dùng lại đơn cũ thay vì tạo đơn mới. Muốn thử riêng luồng **đơn mới**, hãy chủ động dùng một tab mới không sao chép tab cũ, rồi kiểm tra mã đơn vừa tạo. Đơn cũ vẫn còn trong lịch sử; tab mới không giải quyết trạng thái thanh toán của đơn cũ.

## 12. Rời trang VNPay hoặc URL đã hết hạn

Vào **Đơn hàng → chọn đơn đang chờ → Tiếp tục thanh toán**.

- URL còn hạn, giao dịch phù hợp: BE trả lại URL của đúng payment đang chờ.
- Quá 10 phút từ lúc tạo đơn: BE tự chuyển đơn `PENDING`/`PAYMENT_FAILED` chưa ghi nhận tiền thành `CANCELLED`. Tác vụ quét chạy lúc khởi động và mỗi 15 giây; xem đơn hoặc tạo thanh toán cũng kiểm tra hạn ngay.
- Xác minh đã thanh toán: ghi nhận kết quả bằng luồng xử lý dùng chung với IPN, rồi hiển thị trạng thái đơn mới nhất.
- VNPay xác nhận giao dịch thất bại: có thể mở lượt mới nếu đơn vẫn còn trong hạn 10 phút, trạng thái và giới hạn số lượt cho phép.
- Hủy đơn vì hết hạn không tự đổi payment thành `FAILED`: ngân hàng có thể đã thu tiền nhưng thông báo chưa về. Payment đang chờ được đánh dấu `ORDER_PAYMENT_EXPIRED` để đối soát.
- Nếu thông báo xác nhận thu tiền về sau khi đơn bị hủy hoặc sau hạn: giữ đơn `CANCELLED`, ghi nhận payment `SUCCESS` với `REFUND_REQUIRED` để xử lý hoàn tiền. Không tự coi là đã hoàn tiền, không trừ kho hoặc cộng điểm cho đơn hủy.
- Đơn đã xác nhận thu tiền không bị tác vụ hết hạn hủy lại. Quy tắc áp dụng cả các đơn đang chờ cũ khi BE chạy bản code mới. BE cần chạy để thực hiện tác vụ nền; khi khởi động lại sẽ quét các đơn quá hạn.

Trong lần kiểm tra ngày 06/11/2026, API tra cứu sandbox đã trả `99 — Unexpected error`, không có chữ ký, cả với một giao dịch đã thanh toán và một giao dịch chờ. Đây là ghi nhận tại thời điểm test, không phải kết luận mọi tài khoản sandbox đều bị lỗi hoặc merchant chắc chắn chưa có quyền.

Nếu tiếp tục gặp lỗi này: tra giao dịch trên trang merchant, rồi phản hồi email hỗ trợ VNPay với TmnCode, mã giao dịch, thời điểm gọi và thông báo lỗi. Không gửi Hash Secret. [Tài liệu querydr của VNPay](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html) phân biệt mã truy vấn với trạng thái thanh toán; querydr trả `00` chưa đủ để kết luận đã thu tiền.

## 13. Xử lý lỗi thường gặp

| Hiện tượng | Kiểm tra/cách xử lý |
| --- | --- |
| `Failed to fetch` khi tải menu hoặc thanh toán | BE có chạy cổng 8080 không; `NEXT_PUBLIC_API_URL` có trỏ đúng BE không; CORS có cho phép origin FE hiện tại không; có đang dùng HTTPS FE gọi HTTP localhost không |
| HTTP 401 trên API tạo thanh toán | Đăng nhập FE để FE tự gửi JWT; kiểm tra token hết hạn hoặc BE vừa đổi `JWT_SECRET`. Token nhập ở Swagger không tự đăng nhập FE |
| HTTP 400 khi tạo đơn | Kiểm tra UUID sản phẩm, size/topping hợp lệ, tồn kho và payload. Dùng món lấy từ API menu thật |
| HTTP 409 ở API tạo thanh toán | Đọc `message` trong response: đơn đã thu tiền, URL hết hạn, giao dịch cần đối soát hoặc đã hết số lượt. Không tự sửa DB thành `PAID`/`FAILED` để bỏ chặn |
| Cloudflare báo không tới được origin/502 | Kiểm tra ứng dụng local đã chạy, cổng tunnel khớp 8080 hoặc 3000; tunnel không thay thế tiến trình BE/FE |
| Cloudflare FE báo `Unauthorized` ở `/_next/hmr` | Cập nhật `DEV_TUNNEL_HOST` đúng hostname FE mới, khởi động lại FE và tải lại trang. Đây là kết nối dev HMR, khác với lỗi JWT của API |
| Thanh toán xong vẫn `PENDING` | Kiểm tra IPN đã lưu đúng trên merchant, tunnel BE còn hoạt động, log BE và trạng thái giao dịch merchant; bấm **Kiểm tra trạng thái** để yêu cầu đối soát |
| `Không xác minh được phản hồi VNPay` | Kiểm tra kết quả querydr và chữ ký. Trong phiên test nêu trên sandbox trả lỗi 99 không có chữ ký. Không đủ thông tin để coi giao dịch đã thất bại |
| Prisma `P1001` | Mở Docker Desktop; xác nhận `brewlite-db` đang chạy và `DATABASE_URL` đúng |
| Prisma generate báo `EPERM` với DLL | Dừng BE đang giữ Prisma engine rồi generate lại; mở BE lại sau đó |

## 14. Khi khởi động lại tunnel

### URL tunnel backend đổi

1. Sửa `VNPAY_RETURN_URL` trong BE.
2. Sửa dòng ghi chú cấu hình `VNPAY_IPN_URL` trong BE nếu đang lưu biến này.
3. **Cập nhật IPN trên trang merchant VNPay**.
4. Nếu FE dùng API công khai, sửa `NEXT_PUBLIC_API_URL`.
5. Khởi động lại BE và FE có biến vừa đổi.

URL thanh toán đã tạo chứa return URL cũ, không được cập nhật ngược khi sửa `.env`. Để thử cấu hình mới, dùng giao dịch/đơn test mới phù hợp; giao dịch cũ vẫn phải được xác minh theo trạng thái thực tế.

### URL tunnel frontend đổi

1. Sửa `FRONTEND_URL` và danh sách `CORS_ORIGIN` trong BE.
2. Sửa `DEV_TUNNEL_HOST` trong FE.
3. Khởi động lại BE và FE.
4. Dùng địa chỉ FE mới, đăng nhập lại nếu trình duyệt chưa có session ở origin mới.

### Chỉ test localhost, tắt tunnel frontend

Đặt lại BE:

```dotenv
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

Đặt lại FE:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Khởi động lại các ứng dụng. Giữ tunnel BE nếu cần nhận IPN và đang dùng tunnel đó trong return URL.

## 15. Chạy các kiểm tra liên quan

Unit test backend VNPay:

```powershell
Set-Location 'D:\Software_engine\SWE_Project\backend'
npm test -- --runInBand vnpay
```

Kiểm tra logic gọi thanh toán FE:

```powershell
Set-Location 'D:\Software_engine\SWE_Project\frontend'
node --test tests/vnpay-payment.test.mjs
```

Các test này kiểm tra logic bằng mock, không thay thế việc thanh toán thử trên cổng VNPay và xác nhận IPN thực tế.

## 16. Checklist cho mỗi buổi test

- [ ] Docker và PostgreSQL đã sẵn sàng.
- [ ] BE và FE chạy đúng cổng; không mở trùng hai BE hoặc hai FE trên cùng cổng.
- [ ] TmnCode và Hash Secret là thông tin sandbox được cấp.
- [ ] Tunnel BE đang hoạt động, URL khớp return và IPN đã lưu trên merchant.
- [ ] FE dùng đúng API URL cho localhost hoặc truy cập công khai.
- [ ] CORS cho phép đúng origin FE.
- [ ] Đã khởi động lại ứng dụng sau khi đổi biến môi trường.
- [ ] Đăng nhập đúng tài khoản sở hữu đơn.
- [ ] Kiểm tra đúng mã đơn; phân biệt đơn mới với đơn cũ hết hạn.
- [ ] Sau thanh toán kiểm tra trạng thái từ BE/DB, không chỉ nhìn trang return.

## Tài liệu đối chiếu

- [VNPay: kết nối cổng thanh toán](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).
- [VNPay: API querydr/refund](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).
- [VNPay: bảng mã lỗi](https://sandbox.vnpayment.vn/apis/docs/bang-ma-loi/).
- [Cloudflare: Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
- Cấu hình dự án: `backend/src/payments/vnpay.service.ts`, `backend/src/payments/vnpay-checkout.service.ts`, `backend/src/payments/vnpay-reconciliation.service.ts`, `backend/src/payments/vnpay-callback.service.ts`, `backend/src/main.ts`, `frontend/next.config.ts`, `frontend/utils/startVnpayPayment.ts`, `frontend/components/CheckoutModal.tsx` và `docker-compose.yml`.
