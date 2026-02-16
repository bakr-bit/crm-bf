-- CreateTable
CREATE TABLE "WishlistItem" (
    "wishlistItemId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "contactedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("wishlistItemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_assetId_name_key" ON "WishlistItem"("assetId", "name");

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("assetId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_contactedByUserId_fkey" FOREIGN KEY ("contactedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
