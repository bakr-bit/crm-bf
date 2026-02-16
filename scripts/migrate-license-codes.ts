/**
 * One-time migration: convert legacy license codes to ISO country codes.
 *
 * Run with: npx tsx scripts/migrate-license-codes.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";

const LEGACY_LICENSE_TO_COUNTRY: Record<string, string> = {
  MGA: "MT",
  UKGC: "GB",
  CUR: "CW",
  GIB: "GI",
  ANJ: "FR",
  KAN: "CA",
  IOM: "IM",
  ALG: "GB",
  SWE: "SE",
  DEN: "DK",
  EST: "EE",
  ITA: "IT",
  ESP: "ES",
  POR: "PT",
  GRE: "GR",
  ROM: "RO",
  CRO: "HR",
  CZE: "CZ",
  LTU: "LT",
  LVA: "LV",
  PHI: "PH",
  BRA: "BR",
};

function migrateCodes(codes: string[]): string[] {
  return [...new Set(codes.map((c) => LEGACY_LICENSE_TO_COUNTRY[c] ?? c))];
}

async function main() {
  const prisma = new PrismaClient();

  try {
    // --- Brands ---
    const brands = await prisma.brand.findMany({
      where: { licenses: { isEmpty: false } },
      select: { brandId: true, licenses: true },
    });

    console.log(`Found ${brands.length} brands with licenses`);

    let brandUpdated = 0;
    for (const brand of brands) {
      const migrated = migrateCodes(brand.licenses);
      const changed = JSON.stringify(migrated) !== JSON.stringify(brand.licenses);
      if (changed) {
        await prisma.brand.update({
          where: { brandId: brand.brandId },
          data: { licenses: migrated },
        });
        brandUpdated++;
        console.log(`  Brand ${brand.brandId}: ${brand.licenses.join(",")} -> ${migrated.join(",")}`);
      }
    }
    console.log(`Updated ${brandUpdated} brands\n`);

    // --- IntakeSubmissions (brands is a JSON column) ---
    const submissions = await prisma.intakeSubmission.findMany({
      select: { submissionId: true, brands: true },
    });

    console.log(`Found ${submissions.length} intake submissions`);

    let subUpdated = 0;
    for (const sub of submissions) {
      const brandsJson = sub.brands as Array<{ licenses?: string[]; [key: string]: unknown }>;
      if (!Array.isArray(brandsJson)) continue;

      let changed = false;
      const migrated = brandsJson.map((b) => {
        if (!Array.isArray(b.licenses) || b.licenses.length === 0) return b;
        const newLicenses = migrateCodes(b.licenses);
        if (JSON.stringify(newLicenses) !== JSON.stringify(b.licenses)) {
          changed = true;
        }
        return { ...b, licenses: newLicenses };
      });

      if (changed) {
        await prisma.intakeSubmission.update({
          where: { submissionId: sub.submissionId },
          data: { brands: migrated as unknown as Prisma.InputJsonValue },
        });
        subUpdated++;
        console.log(`  Submission ${sub.submissionId}: updated`);
      }
    }
    console.log(`Updated ${subUpdated} intake submissions`);

    console.log("\nMigration complete!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
