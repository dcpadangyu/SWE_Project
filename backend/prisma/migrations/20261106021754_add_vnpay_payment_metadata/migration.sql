-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "payment_url" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'MOCK';
