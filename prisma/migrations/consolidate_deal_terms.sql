-- =============================================================
-- Migration: Consolidate deal term fields into single text field
-- Merges payoutModel, payoutValue, currency, baseline,
-- conversionFlow, cap, holdPeriod, hasLocalLicense into dealTerms
-- =============================================================

BEGIN;

-- 1. Add new dealTerms column
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "dealTerms" TEXT;

-- 2. Migrate existing data into dealTerms
UPDATE "Deal"
SET "dealTerms" = NULLIF(TRIM(BOTH ' | ' FROM CONCAT_WS(' | ',
  CASE WHEN "payoutModel" IS NOT NULL AND "payoutModel" != ''
    THEN CONCAT("payoutModel",
      CASE WHEN "payoutValue" IS NOT NULL AND "payoutValue" != '' THEN CONCAT(' ', "payoutValue") ELSE '' END,
      CASE WHEN "currency" IS NOT NULL AND "currency" != '' THEN CONCAT(' ', "currency") ELSE '' END
    )
    ELSE CASE WHEN "payoutValue" IS NOT NULL AND "payoutValue" != '' THEN CONCAT('Payout: ', "payoutValue",
      CASE WHEN "currency" IS NOT NULL AND "currency" != '' THEN CONCAT(' ', "currency") ELSE '' END
    ) ELSE NULL END
  END,
  CASE WHEN "baseline" IS NOT NULL AND "baseline" != '' THEN CONCAT('Baseline: ', "baseline") ELSE NULL END,
  CASE WHEN "conversionFlow" IS NOT NULL AND "conversionFlow" != '' THEN CONCAT('Flow: ', "conversionFlow") ELSE NULL END,
  CASE WHEN "cap" IS NOT NULL AND "cap" != '' THEN CONCAT('Cap: ', "cap") ELSE NULL END,
  CASE WHEN "holdPeriod" IS NOT NULL AND "holdPeriod" != '' THEN CONCAT('Hold: ', "holdPeriod") ELSE NULL END,
  CASE WHEN "hasLocalLicense" = true THEN 'Local License' ELSE NULL END
)), '');

-- 3. Drop old columns
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "payoutModel";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "payoutValue";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "baseline";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "conversionFlow";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "cap";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "holdPeriod";
ALTER TABLE "Deal" DROP COLUMN IF EXISTS "hasLocalLicense";

COMMIT;
