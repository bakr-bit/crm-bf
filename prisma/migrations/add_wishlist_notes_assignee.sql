-- Add notes column to WishlistItem
ALTER TABLE "WishlistItem" ADD COLUMN "notes" TEXT;

-- Add assignedToUserId column to WishlistItem
ALTER TABLE "WishlistItem" ADD COLUMN "assignedToUserId" TEXT;

-- Add foreign key constraint for assignedToUserId
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
