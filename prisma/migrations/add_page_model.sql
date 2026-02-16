-- =============================================================
-- Migration: Add Page model between Asset and Position
-- Creates "Homepage" page per asset, moves positions & deals
-- =============================================================

BEGIN;

-- 1. Create PageStatus enum
DO $$ BEGIN
  CREATE TYPE "PageStatus" AS ENUM ('Active', 'Archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create Page table
CREATE TABLE IF NOT EXISTS "Page" (
    "pageId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "description" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Page_pkey" PRIMARY KEY ("pageId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Page_assetId_name_key" ON "Page"("assetId", "name");

ALTER TABLE "Page" DROP CONSTRAINT IF EXISTS "Page_assetId_fkey";
ALTER TABLE "Page" ADD CONSTRAINT "Page_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("assetId") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Add nullable pageId columns
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "pageId" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "pageId" TEXT;

-- 4. Create a "Homepage" page for EVERY asset
INSERT INTO "Page" ("pageId", "assetId", "name", "status", "createdAt", "updatedAt")
SELECT
    'pg_' || a."assetId",
    a."assetId",
    'Homepage',
    'Active',
    NOW(),
    NOW()
FROM "Asset" a
ON CONFLICT ("assetId", "name") DO NOTHING;

-- 5. Move all existing positions into their asset's Homepage page
UPDATE "Position" pos
SET "pageId" = 'pg_' || pos."assetId"
WHERE pos."pageId" IS NULL;

-- 6. Populate pageId on deals via their position's new page
UPDATE "Deal" d
SET "pageId" = p."pageId"
FROM "Position" p
WHERE d."positionId" = p."positionId"
  AND d."pageId" IS NULL;

-- 7. Make pageId NOT NULL
ALTER TABLE "Position" ALTER COLUMN "pageId" SET NOT NULL;
ALTER TABLE "Deal" ALTER COLUMN "pageId" SET NOT NULL;

-- 8. Add foreign keys
ALTER TABLE "Position" DROP CONSTRAINT IF EXISTS "Position_pageId_fkey";
ALTER TABLE "Position" ADD CONSTRAINT "Position_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("pageId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS "Deal_pageId_fkey";
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("pageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 9. Replace Position unique constraint: (assetId, name) -> (pageId, name)
ALTER TABLE "Position" DROP CONSTRAINT IF EXISTS "Position_assetId_name_key";
DROP INDEX IF EXISTS "Position_pageId_name_key";
CREATE UNIQUE INDEX "Position_pageId_name_key" ON "Position"("pageId", "name");

-- 10. Drop old assetId FK and column from Position
ALTER TABLE "Position" DROP CONSTRAINT IF EXISTS "Position_assetId_fkey";
ALTER TABLE "Position" DROP COLUMN IF EXISTS "assetId";

COMMIT;
