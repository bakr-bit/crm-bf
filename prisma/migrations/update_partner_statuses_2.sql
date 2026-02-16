-- Step 2: Migrate existing data and update default (run after enum values are committed)
UPDATE "Partner" SET status = 'Lead' WHERE status = 'Pending';
UPDATE "Partner" SET status = 'Active' WHERE status = 'Inactive';
UPDATE "Partner" SET status = 'Active' WHERE status = 'Archived';
ALTER TABLE "Partner" ALTER COLUMN "status" SET DEFAULT 'Lead'::"PartnerStatus";
