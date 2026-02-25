-- Fix any assets with NULL status to Active
UPDATE "Asset" SET "status" = 'Active' WHERE "status" IS NULL;

-- Ensure the default is set at the database level
ALTER TABLE "Asset" ALTER COLUMN "status" SET DEFAULT 'Active';
