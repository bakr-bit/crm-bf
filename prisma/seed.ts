import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

async function main() {
  // Use transaction pooler (6543) for runtime queries
  const connStr = process.env.DATABASE_URL!.replace(":5432/", ":6543/");
  const pool = new pg.Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: "admin@bakersfield.com" },
  });

  if (existing) {
    console.log("Seed data already exists, skipping.");
    await pool.end();
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@bakersfield.com",
      passwordHash,
      name: "Admin User",
    },
  });

  console.log("Created admin user:", admin.email);

  // Create sample partner
  const partner = await prisma.partner.create({
    data: {
      name: "BetWinner Corp",
      websiteDomain: "betwinner.com",
      isDirect: true,
      status: "Active",
      hasContract: true,
      hasLicense: true,
      hasBanking: true,
      ownerUserId: admin.id,
    },
  });

  console.log("Created partner:", partner.name);

  // Create sample brand
  const brand = await prisma.brand.create({
    data: {
      partnerId: partner.partnerId,
      name: "BetWinner Casino",
      brandDomain: "casino.betwinner.com",
      trackingDomain: "track.betwinner.com",
      status: "Active",
    },
  });

  console.log("Created brand:", brand.name);

  // Create sample contact
  await prisma.contact.create({
    data: {
      partnerId: partner.partnerId,
      name: "John Smith",
      email: "john@betwinner.com",
      phone: "+1234567890",
      role: "Affiliate Manager",
    },
  });

  console.log("Created contact: John Smith");

  // Create sample asset
  const asset = await prisma.asset.create({
    data: {
      name: "Casino Rankings UK",
      assetDomain: "casinorankings.co.uk",
      description: "Top casino comparison site for UK market",
    },
  });

  console.log("Created asset:", asset.name);

  // Create sample positions
  const pos1 = await prisma.position.create({
    data: {
      assetId: asset.assetId,
      name: "Homepage #1",
      details: "Top position on homepage toplist",
    },
  });

  const pos2 = await prisma.position.create({
    data: {
      assetId: asset.assetId,
      name: "Homepage #2",
      details: "Second position on homepage toplist",
    },
  });

  await prisma.position.create({
    data: {
      assetId: asset.assetId,
      name: "Homepage #3",
      details: "Third position on homepage toplist",
    },
  });

  console.log("Created 3 positions");

  // Create sample deal
  await prisma.deal.create({
    data: {
      partnerId: partner.partnerId,
      brandId: brand.brandId,
      assetId: asset.assetId,
      positionId: pos1.positionId,
      affiliateLink: "https://track.betwinner.com/aff123",
      status: "Active",
      isDirect: true,
      createdById: admin.id,
    },
  });

  console.log("Created sample deal for position #1");

  // Create an ended deal for position #2 to show history
  await prisma.deal.create({
    data: {
      partnerId: partner.partnerId,
      brandId: brand.brandId,
      assetId: asset.assetId,
      positionId: pos2.positionId,
      affiliateLink: "https://track.betwinner.com/aff456",
      status: "Ended",
      isDirect: true,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-06-01"),
      createdById: admin.id,
    },
  });

  console.log("Created ended deal for position #2");

  // Create audit log entries individually (createMany uses transactions)
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      entity: "Partner",
      entityId: partner.partnerId,
      action: "created",
      details: { name: partner.name },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      entity: "Brand",
      entityId: brand.brandId,
      action: "created",
      details: { name: brand.name },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      entity: "Asset",
      entityId: asset.assetId,
      action: "created",
      details: { name: asset.name },
    },
  });

  console.log("Created audit log entries");
  console.log("Seed complete!");

  await pool.end();
}

main().catch(console.error);
