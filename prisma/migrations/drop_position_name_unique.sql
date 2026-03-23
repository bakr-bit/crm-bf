-- Drop the unique constraint on (pageId, name) for positions.
-- Ordering is handled by sortOrder, names are just labels.
DROP INDEX IF EXISTS "Position_pageId_name_key";
