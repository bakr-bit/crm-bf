import "dotenv/config";
import { Pool } from "pg";

type PartnerRow = {
  partner_id: string;
  name: string;
  website_domain: string | null;
  is_direct: boolean;
  status: string;
  has_contract: boolean;
  has_license: boolean;
  has_banking: boolean;
  sop_notes: string | null;
  last_invoiced_at: Date | null;
  created_at: Date;
  updated_at: Date;
  banking_file_url: string | null;
  contract_file_url: string | null;
  license_file_url: string | null;
  admin_only: boolean;
  account_manager_user_id: string | null;
};

type BrandRow = {
  brand_id: string;
  partner_id: string;
  name: string;
  brand_domain: string | null;
  brand_identifiers: unknown;
  status: string;
  admin_only: boolean;
  created_at: Date;
  updated_at: Date;
  target_geos: string[];
  affiliate_software: string | null;
  extra_info: string | null;
  postbacks: string[];
  licenses: string[];
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const sourceDbUrl = requiredEnv("SOURCE_DATABASE_URL");
  const targetDbUrl = requiredEnv("TARGET_DATABASE_URL");
  const targetSchema = process.env.TARGET_SCHEMA?.trim() || "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(targetSchema)) {
    throw new Error(`Invalid TARGET_SCHEMA value: ${targetSchema}`);
  }
  const force = process.argv.includes("--force");

  const source = new Pool({ connectionString: sourceDbUrl, ssl: { rejectUnauthorized: false } });
  const target = new Pool({ connectionString: targetDbUrl, ssl: { rejectUnauthorized: false } });

  try {
    console.log(`Reading partners + brands from source...`);

    const partners = (
      await source.query<PartnerRow>(
        `SELECT
          "partnerId" AS partner_id,
          name,
          "websiteDomain" AS website_domain,
          "isDirect" AS is_direct,
          status::text AS status,
          "hasContract" AS has_contract,
          "hasLicense" AS has_license,
          "hasBanking" AS has_banking,
          "sopNotes" AS sop_notes,
          "lastInvoicedAt" AS last_invoiced_at,
          "createdAt" AS created_at,
          "updatedAt" AS updated_at,
          "bankingFileUrl" AS banking_file_url,
          "contractFileUrl" AS contract_file_url,
          "licenseFileUrl" AS license_file_url,
          "adminOnly" AS admin_only,
          "accountManagerUserId" AS account_manager_user_id
        FROM public."Partner"
        ORDER BY "createdAt" ASC`
      )
    ).rows;

    const brands = (
      await source.query<BrandRow>(
        `SELECT
          "brandId" AS brand_id,
          "partnerId" AS partner_id,
          name,
          "brandDomain" AS brand_domain,
          "brandIdentifiers" AS brand_identifiers,
          status::text AS status,
          "adminOnly" AS admin_only,
          "createdAt" AS created_at,
          "updatedAt" AS updated_at,
          "targetGeos" AS target_geos,
          "affiliateSoftware" AS affiliate_software,
          "extraInfo" AS extra_info,
          postbacks,
          licenses
        FROM public."Brand"
        ORDER BY "createdAt" ASC`
      )
    ).rows;

    console.log(`Source rows -> partners: ${partners.length}, brands: ${brands.length}`);

    await target.query("BEGIN");
    await target.query(`SET LOCAL search_path TO ${targetSchema}, public`);

    const existingPartnerCount = Number(
      (await target.query(`SELECT COUNT(*)::int AS c FROM "Partner"`)).rows[0].c
    );

    if (existingPartnerCount > 0 && !force) {
      throw new Error(
        `Target schema '${targetSchema}' is not empty (${existingPartnerCount} partners found). Aborting. Re-run with --force if this is intentional.`
      );
    }

    if (force) {
      console.log(`--force set. Clearing existing Brand + Partner rows in target schema '${targetSchema}'...`);
      await target.query(`DELETE FROM "Brand"`);
      await target.query(`DELETE FROM "Partner"`);
    }

    for (const p of partners) {
      await target.query(
        `INSERT INTO "Partner" (
          "partnerId", name, "websiteDomain", "isDirect", status,
          "hasContract", "hasLicense", "hasBanking", "sopNotes", "lastInvoicedAt",
          "createdAt", "updatedAt", "bankingFileUrl", "contractFileUrl", "licenseFileUrl",
          "adminOnly", "accountManagerUserId"
        ) VALUES (
          $1, $2, $3, $4, 'Lead'::"PartnerStatus",
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, NULL
        )`,
        [
          p.partner_id,
          p.name,
          p.website_domain,
          p.is_direct,
          p.has_contract,
          p.has_license,
          p.has_banking,
          p.sop_notes,
          p.last_invoiced_at,
          p.created_at,
          p.updated_at,
          p.banking_file_url,
          p.contract_file_url,
          p.license_file_url,
          p.admin_only,
        ]
      );
    }

    for (const b of brands) {
      await target.query(
        `INSERT INTO "Brand" (
          "brandId", "partnerId", name, "brandDomain", "brandIdentifiers", status,
          "adminOnly", "createdAt", "updatedAt", "targetGeos", "affiliateSoftware",
          "extraInfo", postbacks, licenses
        ) VALUES (
          $1, $2, $3, $4, $5, $6::"BrandStatus",
          $7, $8, $9, $10, $11,
          $12, $13, $14
        )`,
        [
          b.brand_id,
          b.partner_id,
          b.name,
          b.brand_domain,
          b.brand_identifiers,
          b.status,
          b.admin_only,
          b.created_at,
          b.updated_at,
          b.target_geos,
          b.affiliate_software,
          b.extra_info,
          b.postbacks,
          b.licenses,
        ]
      );
    }

    const targetPartnerStatus = await target.query(
      `SELECT status::text, COUNT(*)::int AS c FROM "Partner" GROUP BY status ORDER BY status`
    );
    const targetPartnerCount = Number((await target.query(`SELECT COUNT(*)::int AS c FROM "Partner"`)).rows[0].c);
    const targetBrandCount = Number((await target.query(`SELECT COUNT(*)::int AS c FROM "Brand"`)).rows[0].c);

    await target.query("COMMIT");

    console.log("Clone complete.");
    console.log(`Target rows -> partners: ${targetPartnerCount}, brands: ${targetBrandCount}`);
    console.log("Target partner status distribution:");
    for (const row of targetPartnerStatus.rows as Array<{ status: string; c: number }>) {
      console.log(`  ${row.status}: ${row.c}`);
    }
  } catch (error) {
    await target.query("ROLLBACK");
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error("Failed to clone partners/brands:", error instanceof Error ? error.message : error);
  process.exit(1);
});
