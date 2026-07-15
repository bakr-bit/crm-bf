import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function getDbUsername(connectionString?: string) {
  if (!connectionString) return null;
  try {
    return new URL(connectionString).username || null;
  } catch {
    return null;
  }
}

function resolveConnectionString() {
  const direct = process.env.DIRECT_DATABASE_URL;
  const pooled = process.env.DATABASE_URL;

  const directUser = getDbUsername(direct)?.toLowerCase();
  const pooledUser = getDbUsername(pooled)?.toLowerCase();

  if (direct && pooled) {
    // Preview safety: if one URL uses the known-bad `bot` user and the other doesn't,
    // prefer the non-bot credential to avoid auth hard-fails (P1000/28P01).
    if (directUser === "bot" && pooledUser && pooledUser !== "bot") {
      return pooled;
    }
    if (pooledUser === "bot" && directUser && directUser !== "bot") {
      return direct;
    }
  }

  return direct || pooled;
}

const pool = globalForPrisma.pool ?? new pg.Pool({
  connectionString: resolveConnectionString(),
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
