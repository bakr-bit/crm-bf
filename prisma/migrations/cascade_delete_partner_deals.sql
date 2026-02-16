-- Add ON DELETE CASCADE to Deal -> Partner foreign key
ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS "Deal_partnerId_fkey";
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("partnerId") ON DELETE CASCADE ON UPDATE CASCADE;
