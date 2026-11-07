-- Preserve the payment fields and indexes created by add_payments.
BEGIN;
ALTER TABLE "payments" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "payments" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "updated_at" SET NOT NULL;
CREATE TYPE "DiscountType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');
ALTER TABLE "vouchers" ALTER COLUMN "discount_type" TYPE "DiscountType" USING "discount_type"::text::"DiscountType";
DROP TYPE "VoucherType";
ALTER TABLE "vouchers"
 ADD COLUMN "end_date" TIMESTAMP(3),
 ADD COLUMN "max_discount" DECIMAL(10,2),
 ADD COLUMN "min_order_value" DECIMAL(10,2),
 ADD COLUMN "start_date" TIMESTAMP(3),
 ADD COLUMN "usage_limit" INTEGER,
 ADD COLUMN "used_count" INTEGER NOT NULL DEFAULT 0;
COMMIT;
