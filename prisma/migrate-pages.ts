import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * Fallback migration script: Creates "Homepage" pages for any assets
 * that don't yet have one, and moves orphaned positions/deals.
 *
 * The SQL migration (20260216000000_add_page_model) handles everything
 * automatically. This script only needs to be run if you bypassed the
 * SQL migration or need to fix up data manually.
 *
 * Usage: npx tsx prisma/migrate-pages.ts
 */
async function main() {
  const connStr = process.env.DATABASE_URL!.replace(":5432/", ":6543/");
  const pool = new pg.Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Find assets missing a Homepage page
  const assetsWithoutPage: { assetId: string; name: string }[] = await prisma.$queryRaw`
    SELECT a."assetId", a."name"
    FROM "Asset" a
    WHERE NOT EXISTS (
      SELECT 1 FROM "Page" p WHERE p."assetId" = a."assetId" AND p."name" = 'Homepage'
    )
  `;

  console.log(`Found ${assetsWithoutPage.length} assets without a Homepage page.`);

  for (const asset of assetsWithoutPage) {
    const pageId = `pg_${asset.assetId}`;
    await prisma.$queryRaw`
      INSERT INTO "Page" ("pageId", "assetId", "name", "status", "createdAt", "updatedAt")
      VALUES (${pageId}, ${asset.assetId}, 'Homepage', 'Active', NOW(), NOW())
      ON CONFLICT ("assetId", "name") DO NOTHING
    `;
    console.log(`Created Homepage for asset "${asset.name}"`);
  }

  // Move any orphaned positions (pageId IS NULL) to their asset's Homepage
  const posResult = await prisma.$executeRaw`
    UPDATE "Position" pos
    SET "pageId" = pg."pageId"
    FROM "Page" pg
    WHERE pg."assetId" = pos."assetId"
      AND pg."name" = 'Homepage'
      AND (pos."pageId" IS NULL OR pos."pageId" = '')
  `;
  if (posResult > 0) console.log(`Moved ${posResult} orphaned positions.`);

  // Populate pageId on deals missing it
  const dealResult = await prisma.$executeRaw`
    UPDATE "Deal" d
    SET "pageId" = p."pageId"
    FROM "Position" p
    WHERE d."positionId" = p."positionId"
      AND (d."pageId" IS NULL OR d."pageId" = '')
  `;
  if (dealResult > 0) console.log(`Updated ${dealResult} orphaned deals.`);

  console.log("Done.");
  await pool.end();
}

main().catch(console.error);
