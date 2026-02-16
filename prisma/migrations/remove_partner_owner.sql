-- Copy ownerUserId into accountManagerUserId where accountManager is not yet set
UPDATE "Partner"
SET "accountManagerUserId" = "ownerUserId"
WHERE "accountManagerUserId" IS NULL;

-- Drop the foreign key constraint on ownerUserId
ALTER TABLE "Partner" DROP CONSTRAINT IF EXISTS "Partner_ownerUserId_fkey";

-- Drop the ownerUserId column
ALTER TABLE "Partner" DROP COLUMN "ownerUserId";
