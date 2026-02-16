-- Step 1: Add new enum values (each must be its own statement, committed before use)
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'Lead';
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'EstablishedContact';
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'PlatformSignedUp';
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'AwaitingKYC';
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'AvailableForAsset';
ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'AwaitingPostback';
