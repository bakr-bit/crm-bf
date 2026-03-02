-- Migrate partners with AvailableForAsset status to Active
UPDATE "Partner" SET status = 'Active' WHERE status = 'AvailableForAsset';

-- Remove AvailableForAsset from PartnerStatus enum
ALTER TYPE "PartnerStatus" RENAME TO "PartnerStatus_old";
CREATE TYPE "PartnerStatus" AS ENUM ('Lead', 'EstablishedContact', 'PlatformSignedUp', 'AwaitingKYC', 'AwaitingPostback', 'Active');
ALTER TABLE "Partner" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Partner" ALTER COLUMN "status" TYPE "PartnerStatus" USING status::text::"PartnerStatus";
ALTER TABLE "Partner" ALTER COLUMN "status" SET DEFAULT 'Lead'::"PartnerStatus";
DROP TYPE "PartnerStatus_old";

-- Add maxUses column to IntakeLink with default 1
ALTER TABLE "IntakeLink" ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 1;
