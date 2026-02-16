import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

/**
 * Runs the add_page_model.sql migration against the database.
 * Usage: npx tsx prisma/run-migration.ts
 */
async function main() {
  const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("ERROR: No database URL found.");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const sqlPath = path.join(__dirname, "migrations", "add_page_model.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("==> Running SQL migration...");
  try {
    await pool.query(sql);
    console.log("==> SQL migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
