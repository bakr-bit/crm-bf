-- =============================================================
-- Migration: Remove path column from Position
-- The path concept now lives on Page, not Position
-- =============================================================

ALTER TABLE "Position" DROP COLUMN IF EXISTS "path";
