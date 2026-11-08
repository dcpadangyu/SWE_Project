# Đối chiếu migration trước khi nhận nhánh VNPay

Hai migration lịch sử đã thay đổi nội dung trong nhánh VNPay:

- `20261102193258_init_payment_voucher`
- `20261103071149_finalize_payment_voucher_schema`

Nếu DB đã ghi checksum của phiên bản khác, Prisma có thể báo migration đã bị sửa khi chạy `migrate dev`. Chưa xác nhận các thành viên đang dùng phiên bản nào, nên việc tương thích lịch sử DB **chưa hoàn tất**.

## Vì sao chưa khôi phục nguyên bản ngay?

Đối chiếu với commit `fc7b1be` cho thấy migration `20261101150000_add_payments` đã tạo bảng `payments`, các enum thanh toán và cột `payment_method`/`attempt_number`. Bản gốc của hai migration sau lại tạo trùng các đối tượng này. Migration đầu còn xóa rồi thêm lại nhiều cột đơn hàng; migration sau xóa rồi thêm lại loại giảm giá voucher.

Phiên bản trên nhánh VNPay dùng đổi tên cột và chuyển kiểu để giữ dữ liệu, đồng thời tránh tạo trùng. Tuy nhiên, sửa SQL lịch sử vẫn ảnh hưởng checksum. Khôi phục nguyên bản rồi chỉ thêm một migration ở cuối không giải quyết được lỗi tạo trùng xảy ra trước đó trên DB mới.

## Cách làm lại DB local chỉ chứa dữ liệu thử nghiệm

Nếu DB local chỉ chứa dữ liệu thử nghiệm và được phép xóa toàn bộ dữ liệu, có thể reset để chạy lại bộ migration hiện tại sau khi lấy code mới.

**Lệnh này xóa toàn bộ dữ liệu trong DB/schema mà Prisma kết nối**, bao gồm tài khoản, đơn hàng và giao dịch thanh toán. Trước khi chạy, kiểm tra `DATABASE_URL` trong `backend/.env` cùng biến môi trường của terminal (nếu có) để chắc chắn đang trỏ đúng DB local dùng thử. Không thực hiện với DB dùng chung hoặc DB cần giữ dữ liệu.

Chạy trong thư mục `backend`:

```powershell
npx prisma migrate reset
```

Đọc thông báo xác nhận của Prisma trước khi đồng ý. Lệnh reset sẽ chạy lại các migration và có thể chạy seed theo cấu hình của project. Nếu cần dữ liệu mẫu mà seed chưa được chạy, dùng:

```powershell
npm run prisma:seed
```

Giữ nguyên thư mục `prisma/migrations` được lấy cùng code mới. Xóa code cũ rồi tải lại không tự sửa lịch sử migration trong DB; không xóa từng file migration để xử lý lệch checksum. Reset chỉ là phương án tạo lại DB thử nghiệm, không giải quyết việc nâng cấp DB cần giữ dữ liệu.

## Thông tin cần thu thập từ mỗi DB cần giữ dữ liệu

Chạy từ thư mục `backend`, đúng DB cần đối chiếu. Các bước dưới đây chỉ đọc, không sửa dữ liệu.

```powershell
npx prisma migrate status

Get-FileHash -Algorithm SHA256 -LiteralPath .\prisma\migrations\20261102193258_init_payment_voucher\migration.sql
Get-FileHash -Algorithm SHA256 -LiteralPath .\prisma\migrations\20261103071149_finalize_payment_voucher_schema\migration.sql
```

Trong công cụ SQL đang kết nối DB đó, chạy:

```sql
SELECT migration_name, checksum, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name IN (
  '20261101150000_add_payments',
  '20261102193258_init_payment_voucher',
  '20261103071149_finalize_payment_voucher_schema'
)
ORDER BY started_at;

SELECT table_name, column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'order_items', 'payments', 'vouchers', 'loyalty_transactions')
ORDER BY table_name, ordinal_position;
```

Gửi kết quả cùng tên nhánh/commit đang dùng cho người phụ trách DB. Không gửi `.env`, mật khẩu hoặc chuỗi kết nối. Hash file có thể khác do LF/CRLF; cần đối chiếu cả nội dung SQL và kiểu xuống dòng trước khi kết luận khác phiên bản.

## Chọn cách xử lý sau khi có kết quả

1. **Chưa áp dụng hai migration:** kiểm tra lịch sử trước đó khớp và thử chuỗi migration trên DB thử nghiệm riêng trước khi nâng cấp DB cần giữ dữ liệu.
2. **Đã áp dụng đúng nội dung hiện tại:** giữ nguyên SQL này; kiểm tra schema thực tế và các migration còn thiếu.
3. **Đã áp dụng nội dung khác hoặc migration đang lỗi:** sao lưu DB, xác định schema thực tế và thử phương án nâng cấp/baseline trên bản sao. Chỉ chốt lịch sử chung sau khi chứng minh schema và dữ liệu được giữ. Không chạy lại SQL cũ lên bảng đang có dữ liệu chỉ để khớp tên migration.

Không tự cập nhật checksum trong `_prisma_migrations`, đánh dấu `resolve --applied` khi chưa kiểm chứng schema, hoặc dùng `migrate reset` với DB cần giữ dữ liệu. Chưa có lệnh sửa chung an toàn cho mọi DB khi lịch sử áp dụng của nhóm chưa được xác nhận.
