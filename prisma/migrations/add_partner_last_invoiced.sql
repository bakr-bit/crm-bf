-- Add lastInvoicedAt column to Partner
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "lastInvoicedAt" TIMESTAMP(3);
