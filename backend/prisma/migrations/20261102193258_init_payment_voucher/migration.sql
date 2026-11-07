-- Payments and payment enums already exist from 20261101150000_add_payments.
-- Rename columns to preserve existing order data.
BEGIN;
CREATE TYPE "VoucherType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');
CREATE TYPE "TransactionType" AS ENUM ('EARN', 'REDEEM');
ALTER TABLE "order_items" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "order_items" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "order_items" RENAME COLUMN "productName" TO "product_name";
ALTER TABLE "order_items" RENAME COLUMN "selectedToppings" TO "selected_toppings";
ALTER TABLE "order_items" RENAME COLUMN "unitPrice" TO "unit_price";
ALTER TABLE "order_items" RENAME CONSTRAINT "order_items_orderId_fkey" TO "order_items_order_id_fkey";
ALTER TABLE "order_items" RENAME CONSTRAINT "order_items_productId_fkey" TO "order_items_product_id_fkey";
ALTER INDEX "order_items_orderId_idx" RENAME TO "order_items_order_id_idx";
ALTER TABLE "orders" RENAME COLUMN "checkoutKey" TO "checkout_key";
ALTER TABLE "orders" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "orders" RENAME COLUMN "discountAmount" TO "discount_amount";
ALTER TABLE "orders" RENAME COLUMN "orderNumber" TO "order_number";
ALTER TABLE "orders" RENAME COLUMN "totalAmount" TO "total_amount";
ALTER TABLE "orders" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "orders" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "orders" RENAME COLUMN "voucherCode" TO "voucher_code";
ALTER INDEX "orders_checkoutKey_key" RENAME TO "orders_checkout_key_key";
ALTER INDEX "orders_orderNumber_key" RENAME TO "orders_order_number_key";
ALTER INDEX "orders_userId_createdAt_idx" RENAME TO "orders_user_id_created_at_idx";
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "vouchers" (
 "id" TEXT NOT NULL, "code" TEXT NOT NULL,
 "discount_type" "VoucherType" NOT NULL,
 "discount_value" DECIMAL(10,2) NOT NULL,
 "is_active" BOOLEAN NOT NULL DEFAULT true,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");
CREATE TABLE "loyalty_transactions" (
 "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "order_id" TEXT,
 "points" INTEGER NOT NULL, "type" "TransactionType" NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;
