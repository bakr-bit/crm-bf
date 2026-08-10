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

type DbCandidate = { source: string; value?: string };

type CandidateWithMeta = {
  source: string;
  value: string;
  user: string | null;
  looksLikeBotCredential: boolean;
};

function selectConnectionString(candidates: DbCandidate[]) {
  const withValues: CandidateWithMeta[] = candidates
    .filter((candidate): candidate is { source: string; value: string } => Boolean(candidate.value))
    .map((candidate) => {
      const user = getDbUsername(candidate.value)?.toLowerCase() ?? null;
      return {
        ...candidate,
        user,
        looksLikeBotCredential:
          user === "bot" || /:\/\/bot[:@]/i.test(candidate.value),
      };
    });

  const nonBot = withValues.find((candidate) => candidate.user && candidate.user !== "bot");
  if (nonBot) return { selected: nonBot, evaluated: withValues };

  // Preview safety: if DIRECT looks like bot creds and another candidate exists,
  // avoid DIRECT first to reduce P1000 auth loops on private-preview setups.
  if (process.env.VERCEL_ENV === "preview") {
    const nonDirect = withValues.find((candidate) => candidate.source !== "DIRECT_DATABASE_URL");
    const direct = withValues.find((candidate) => candidate.source === "DIRECT_DATABASE_URL");
    if (direct?.looksLikeBotCredential && nonDirect) {
      return { selected: nonDirect, evaluated: withValues };
    }
  }

  return { selected: withValues[0] ?? null, evaluated: withValues };
}

const dbCandidates: DbCandidate[] = process.env.VERCEL_ENV === "preview"
  ? [
      { source: "DATABASE_URL", value: process.env.DATABASE_URL },
      { source: "DIRECT_DATABASE_URL", value: process.env.DIRECT_DATABASE_URL },
      { source: "POSTGRES_PRISMA_URL", value: process.env.POSTGRES_PRISMA_URL },
      { source: "POSTGRES_URL_NON_POOLING", value: process.env.POSTGRES_URL_NON_POOLING },
      { source: "POSTGRES_URL", value: process.env.POSTGRES_URL },
      { source: "SUPABASE_DB_URL", value: process.env.SUPABASE_DB_URL },
    ]
  : [
      { source: "DIRECT_DATABASE_URL", value: process.env.DIRECT_DATABASE_URL },
      { source: "DATABASE_URL", value: process.env.DATABASE_URL },
      { source: "POSTGRES_PRISMA_URL", value: process.env.POSTGRES_PRISMA_URL },
      { source: "POSTGRES_URL_NON_POOLING", value: process.env.POSTGRES_URL_NON_POOLING },
      { source: "POSTGRES_URL", value: process.env.POSTGRES_URL },
      { source: "SUPABASE_DB_URL", value: process.env.SUPABASE_DB_URL },
    ];

const { selected: selectedDb, evaluated: evaluatedDbCandidates } = selectConnectionString(dbCandidates);

export const prismaDbDiagnostics = {
  source: selectedDb?.source ?? null,
  user: getDbUsername(selectedDb?.value) ?? null,
  candidates: evaluatedDbCandidates.map((candidate) => ({
    source: candidate.source,
    user: candidate.user,
    looksLikeBotCredential: candidate.looksLikeBotCredential,
  })),
  hasDirect: Boolean(process.env.DIRECT_DATABASE_URL),
  hasDatabase: Boolean(process.env.DATABASE_URL),
  hasPostgresPrisma: Boolean(process.env.POSTGRES_PRISMA_URL),
  hasPostgresNonPooling: Boolean(process.env.POSTGRES_URL_NON_POOLING),
  hasPostgresUrl: Boolean(process.env.POSTGRES_URL),
  hasSupabaseDbUrl: Boolean(process.env.SUPABASE_DB_URL),
};

const pool = globalForPrisma.pool ?? new pg.Pool({
  connectionString: selectedDb?.value,
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
