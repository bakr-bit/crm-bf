-- Add geos array column to Asset
ALTER TABLE "Asset" ADD COLUMN "geos" TEXT[] NOT NULL DEFAULT '{}';
