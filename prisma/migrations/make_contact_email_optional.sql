-- Make Contact email optional and drop unique constraint
ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_partnerId_email_key";
ALTER TABLE "Contact" ALTER COLUMN "email" DROP NOT NULL;
