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
  console.log("Seed complete!");

  await pool.end();
}

main().catch(console.error);
