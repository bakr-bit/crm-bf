/**
 * Import partners, brands, contacts, credentials, and deals from CSV.
 *
 * Run with:
 *   npx tsx scripts/import-csv.ts              # dry-run (preview)
 *   npx tsx scripts/import-csv.ts --commit     # real import
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

// ── Types ──────────────────────────────────────────────────────────────

interface CsvRow {
  partnerName: string;
  partnerDomain: string;
  isDirect: string;
  deal: string;
  accountManager: string;
  status: string;
  hasContract: string;
  brandName: string;
  brandDomain: string;
  targetGeos: string;
  geoLicense: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  telegramUsername: string;
  preferredContact: string;
  contactFocusGeo: string;
  loginUrl: string;
  username: string;
  email: string;
  password: string;
  softwareType: string;
  dealCountry: string;
  dealAsset: string;
  page: string;
  position: string;
  affiliateLink: string;
  startDate: string;
  payoutModel: string;
  payoutValue: string;
  currency: string;
  baseline: string;
  conversionFlow: string;
  cap: string;
  holdPeriod: string;
  hasLocalLicense: string;
}

const STATUS_MAP: Record<string, string> = {
  Active: "Active",
  "Established Contact": "EstablishedContact",
  "Awaiting Postback": "AwaitingPostback",
  Lead: "Lead",
  "Available for Asset": "Active",
};

const OCCUPYING_STATUSES = [
  "Unsure",
  "InContact",
  "Approved",
  "AwaitingPostback",
  "FullyImplemented",
  "Live",
];

// ── Helpers ────────────────────────────────────────────────────────────

function yesNo(val: string): boolean {
  return val.trim().toLowerCase() === "yes";
}

function trimOrNull(val: string | undefined): string | null {
  if (!val) return null;
  const t = val.trim();
  if (t.length === 0) return null;
  // Treat common placeholders as null
  if (t.toLowerCase() === "n/a" || t === "-" || t === "—") return null;
  return t;
}

function fixUrl(val: string | null): string | null {
  if (!val) return null;
  // Fix common typo: "ttps://" → "https://"
  if (val.startsWith("ttps://")) return `h${val}`;
  return val;
}

function normalizePreferredContact(
  val: string
): "Email" | "Telegram" | "WhatsApp" | "Phone" | null {
  const v = val.trim().toLowerCase();
  if (v === "email") return "Email";
  if (v === "telegram") return "Telegram";
  if (v === "whatsapp") return "WhatsApp";
  if (v === "phone") return "Phone";
  // "x", empty, or unrecognized → null
  return null;
}

function labelFromUrl(url: string, fallback: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).hostname;
  } catch {
    return fallback;
  }
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const commit = process.argv.includes("--commit");
  console.log(commit ? "🔴 COMMIT MODE — will write to DB" : "🟢 DRY-RUN MODE — preview only\n");

  // DB connection (same pattern as migrate-license-codes.ts)
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // ── Read & parse CSV ───────────────────────────────────────────────
    const csvPath = path.join(
      process.env.HOME || "~",
      "Desktop",
      "test import sheet.csv"
    );
    const raw = fs.readFileSync(csvPath, "utf-8");
    const records: string[][] = parse(raw, {
      relax_quotes: true,
      relax_column_count: true,
    });

    // First row is headers
    const rows: CsvRow[] = records.slice(1).map((cols) => ({
      partnerName: (cols[0] || "").trim(),
      partnerDomain: (cols[1] || "").trim(),
      isDirect: (cols[2] || "").trim(),
      deal: (cols[3] || "").trim(),
      accountManager: (cols[4] || "").trim(),
      status: (cols[5] || "").trim(),
      hasContract: (cols[6] || "").trim(),
      brandName: (cols[7] || "").trim(),
      brandDomain: (cols[8] || "").trim(),
      targetGeos: (cols[9] || "").trim(),
      geoLicense: (cols[10] || "").trim(),
      contactName: (cols[11] || "").trim(),
      contactEmail: (cols[12] || "").trim(),
      contactPhone: (cols[13] || "").trim(),
      contactWhatsapp: (cols[14] || "").trim(),
      telegramUsername: (cols[15] || "").trim(),
      preferredContact: (cols[16] || "").trim(),
      contactFocusGeo: (cols[17] || "").trim(),
      loginUrl: (cols[18] || "").trim(),
      username: (cols[19] || "").trim(),
      email: (cols[20] || "").trim(),
      password: (cols[21] || "").trim(),
      softwareType: (cols[22] || "").trim(),
      dealCountry: (cols[23] || "").trim(),
      dealAsset: (cols[24] || "").trim(),
      page: (cols[25] || "").trim(),
      position: (cols[26] || "").trim(),
      affiliateLink: (cols[27] || "").trim(),
      startDate: (cols[28] || "").trim(),
      payoutModel: (cols[29] || "").trim(),
      payoutValue: (cols[30] || "").trim(),
      currency: (cols[31] || "").trim(),
      baseline: (cols[32] || "").trim(),
      conversionFlow: (cols[33] || "").trim(),
      cap: (cols[34] || "").trim(),
      holdPeriod: (cols[35] || "").trim(),
      hasLocalLicense: (cols[36] || "").trim(),
    }));

    console.log(`Parsed ${rows.length} CSV rows\n`);

    // ── Pre-load lookup maps ───────────────────────────────────────────
    const users = await prisma.user.findMany();
    const userByName = new Map<string, string>();
    for (const u of users) {
      if (u.name) userByName.set(u.name.toLowerCase(), u.id);
    }

    const assets = await prisma.asset.findMany({ include: { pages: { include: { positions: true } } } });
    const assetByName = new Map<string, string>();
    const pageByKey = new Map<string, string>(); // "assetId|pageName" → pageId
    const positionByKey = new Map<string, string>(); // "pageId|posName" → positionId
    for (const a of assets) {
      assetByName.set(a.name.toLowerCase(), a.assetId);
      for (const p of a.pages) {
        pageByKey.set(`${a.assetId}|${p.name.toLowerCase()}`, p.pageId);
        for (const pos of p.positions) {
          positionByKey.set(`${p.pageId}|${pos.name.toLowerCase()}`, pos.positionId);
        }
      }
    }

    const existingPartners = await prisma.partner.findMany({
      include: { brands: true, contacts: true, credentials: true },
    });
    const partnerByName = new Map<string, (typeof existingPartners)[0]>();
    for (const p of existingPartners) {
      partnerByName.set(p.name.toLowerCase(), p);
    }

    // Existing deals by positionId for occupancy check
    const existingDeals = await prisma.deal.findMany({
      where: { status: { in: OCCUPYING_STATUSES as any } },
      select: { positionId: true },
    });
    const occupiedPositions = new Set(existingDeals.map((d) => d.positionId));

    // ── Group rows by partner ──────────────────────────────────────────
    interface PartnerGroup {
      name: string;
      rows: CsvRow[];
    }

    const groups: PartnerGroup[] = [];
    const groupMap = new Map<string, PartnerGroup>();

    // First pass: build brand→partner lookup from rows that have a partner name
    const brandToPartner = new Map<string, string>(); // brandName lower → partnerName
    for (const row of rows) {
      if (row.partnerName && row.brandName) {
        const bKey = row.brandName.toLowerCase();
        if (!brandToPartner.has(bKey)) {
          brandToPartner.set(bKey, row.partnerName);
        }
      }
    }
    // Also check existing DB partners for brand→partner mapping
    for (const p of existingPartners) {
      for (const b of p.brands) {
        const bKey = b.name.toLowerCase();
        if (!brandToPartner.has(bKey)) {
          brandToPartner.set(bKey, p.name);
        }
      }
    }

    for (const row of rows) {
      let name = row.partnerName;
      if (!name && row.brandName) {
        // Try to find which partner owns this brand from earlier rows or DB
        name = brandToPartner.get(row.brandName.toLowerCase()) || row.brandName;
      }
      if (!name) {
        console.warn(`  WARN: Row with no partner or brand name, skipping`);
        continue;
      }
      const key = name.toLowerCase();
      let group = groupMap.get(key);
      if (!group) {
        group = { name, rows: [] };
        groupMap.set(key, group);
        groups.push(group);
      }
      group.rows.push(row);
    }

    console.log(`Found ${groups.length} partner groups\n`);

    // ── Counters ───────────────────────────────────────────────────────
    const counts = {
      partnersCreated: 0,
      partnersSkipped: 0,
      brandsCreated: 0,
      brandsSkipped: 0,
      contactsCreated: 0,
      contactsSkipped: 0,
      credentialsCreated: 0,
      credentialsSkipped: 0,
      dealsCreated: 0,
      dealsSkipped: 0,
    };

    // Track IDs created in this run (for dry-run we use placeholders)
    const createdPartnerIds = new Map<string, string>(); // partnerKey → partnerId
    const createdBrandIds = new Map<string, string>(); // "partnerId|brandName" → brandId
    const createdContactNames = new Set<string>(); // "partnerId|contactName"
    const createdCredentialKeys = new Set<string>(); // "partnerId|loginUrl|username"

    // ── Process groups ─────────────────────────────────────────────────

    // We need a function that either creates via prisma or logs in dry-run
    // In commit mode, we collect all operations and run them in a transaction
    type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operations: Array<(tx: TxClient) => Promise<any>> = [];

    for (const group of groups) {
      const firstRow = group.rows[0];
      const partnerKey = group.name.toLowerCase();

      // ── a) Partner ───────────────────────────────────────────────────
      const existingPartner = partnerByName.get(partnerKey);
      let partnerId: string;

      if (existingPartner) {
        partnerId = existingPartner.partnerId;
        console.log(`  SKIP partner "${group.name}" (already exists)`);
        counts.partnersSkipped++;
      } else if (createdPartnerIds.has(partnerKey)) {
        partnerId = createdPartnerIds.get(partnerKey)!;
      } else {
        const statusRaw = firstRow.status;
        const mappedStatus = STATUS_MAP[statusRaw];
        if (statusRaw && !mappedStatus) {
          console.warn(`  WARN: Unrecognized status "${statusRaw}" for partner "${group.name}", defaulting to Lead`);
        }

        const accountManagerId = firstRow.accountManager
          ? userByName.get(firstRow.accountManager.toLowerCase()) || null
          : null;
        if (firstRow.accountManager && !accountManagerId) {
          console.warn(`  WARN: Unknown account manager "${firstRow.accountManager}" for partner "${group.name}"`);
        }

        partnerId = `pending-${partnerKey}`;

        const partnerData = {
          name: group.name,
          websiteDomain: trimOrNull(firstRow.partnerDomain),
          isDirect: yesNo(firstRow.isDirect),
          status: (mappedStatus || "Lead") as "Active" | "EstablishedContact" | "AwaitingPostback" | "Lead" | "PlatformSignedUp" | "AwaitingKYC",
          hasContract: yesNo(firstRow.hasContract),
          hasLicense: false,
          hasBanking: false,
          accountManagerUserId: accountManagerId,
        };

        console.log(`  CREATE partner "${group.name}" [status=${partnerData.status}, isDirect=${partnerData.isDirect}, manager=${firstRow.accountManager || "none"}]`);
        counts.partnersCreated++;

        if (commit) {
          operations.push(async (tx) => {
            const p = await tx.partner.create({ data: partnerData });
            createdPartnerIds.set(partnerKey, p.partnerId);
            // Update partnerId for subsequent operations
            return p;
          });
        }
        createdPartnerIds.set(partnerKey, partnerId);
      }

      // ── b) Brands ──────────────────────────────────────────────────
      const seenBrands = new Set<string>();
      const brandRows: Array<{ row: CsvRow; brandKey: string }> = [];

      for (const row of group.rows) {
        if (!row.brandName) continue;
        const brandKey = `${partnerKey}|${row.brandName.toLowerCase()}`;
        if (seenBrands.has(brandKey)) continue;
        seenBrands.add(brandKey);
        brandRows.push({ row, brandKey });
      }

      for (const { row, brandKey } of brandRows) {
        // Check existing in DB
        const existBrand = existingPartner?.brands.find(
          (b) => b.name.toLowerCase() === row.brandName.toLowerCase()
        );
        if (existBrand) {
          console.log(`    SKIP brand "${row.brandName}" (already exists)`);
          createdBrandIds.set(brandKey, existBrand.brandId);
          counts.brandsSkipped++;
          continue;
        }
        if (createdBrandIds.has(brandKey)) continue;

        const targetGeos = row.targetGeos
          ? row.targetGeos.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean)
          : [];
        const licenses = row.geoLicense
          ? row.geoLicense.split(",").map((l) => l.trim().toUpperCase()).filter(Boolean)
          : [];

        const brandData = {
          name: row.brandName,
          brandDomain: trimOrNull(row.brandDomain),
          targetGeos,
          licenses,
          affiliateSoftware: trimOrNull(row.softwareType),
        };

        console.log(`    CREATE brand "${row.brandName}" [geos=${targetGeos.join(",")}, licenses=${licenses.join(",")}]`);
        counts.brandsCreated++;

        const bKey = brandKey;
        createdBrandIds.set(bKey, `pending-brand-${row.brandName.toLowerCase()}`);

        if (commit) {
          operations.push(async (tx) => {
            const pid = createdPartnerIds.get(partnerKey) || partnerId;
            const b = await tx.brand.create({
              data: { ...brandData, partnerId: pid },
            });
            createdBrandIds.set(bKey, b.brandId);
            return b;
          });
        }
      }

      // ── c) Contacts ────────────────────────────────────────────────
      const seenContacts = new Set<string>();

      for (const row of group.rows) {
        let contactName = row.contactName;
        let contactEmail = trimOrNull(row.contactEmail);

        if (!contactName && !contactEmail) continue;

        // Detect email-in-name-field (e.g. rows with @ in name)
        if (contactName && contactName.includes("@") && !contactEmail) {
          contactEmail = contactName;
          contactName = "";
        }

        if (!contactName && !contactEmail) continue;

        const contactKey = `${partnerKey}|${(contactName || contactEmail!).toLowerCase()}`;
        if (seenContacts.has(contactKey)) continue;
        if (createdContactNames.has(contactKey)) continue;
        seenContacts.add(contactKey);

        // Check existing
        const existContact = existingPartner?.contacts.find(
          (c) => contactName && c.name.toLowerCase() === contactName.toLowerCase()
        );
        if (existContact) {
          console.log(`    SKIP contact "${contactName || contactEmail}" (already exists)`);
          counts.contactsSkipped++;
          continue;
        }

        const preferred = normalizePreferredContact(row.preferredContact);

        const contactData = {
          name: contactName || contactEmail || "",
          email: contactEmail,
          phone: trimOrNull(row.contactPhone),
          whatsapp: trimOrNull(row.contactWhatsapp),
          telegram: trimOrNull(row.telegramUsername),
          preferredContact: preferred,
          geo: trimOrNull(row.contactFocusGeo)?.toUpperCase() || null,
        };

        console.log(`    CREATE contact "${contactData.name}" [preferred=${preferred || "none"}]`);
        counts.contactsCreated++;
        createdContactNames.add(contactKey);

        if (commit) {
          operations.push(async (tx) => {
            const pid = createdPartnerIds.get(partnerKey) || partnerId;
            return tx.contact.create({
              data: { ...contactData, partnerId: pid },
            });
          });
        }
      }

      // ── d) Credentials ─────────────────────────────────────────────
      const seenCredentials = new Set<string>();
      // Track labels used for this partner to avoid @@unique([partnerId, label]) violations
      const usedLabels = new Set<string>(
        (existingPartner?.credentials || []).map((c) => c.label.toLowerCase())
      );

      for (const row of group.rows) {
        const hasUsername = !!trimOrNull(row.username);
        const hasPassword = !!trimOrNull(row.password);
        if (!hasUsername && !hasPassword) continue;

        const loginUrl = trimOrNull(row.loginUrl) || "";
        const credKey = `${partnerKey}|${loginUrl.toLowerCase()}|${(row.username || "").toLowerCase()}`;
        if (seenCredentials.has(credKey)) continue;
        if (createdCredentialKeys.has(credKey)) continue;
        seenCredentials.add(credKey);

        // Check existing by label
        let label = loginUrl ? labelFromUrl(loginUrl, row.brandName) : row.brandName || group.name;
        const existCred = existingPartner?.credentials.find(
          (c) => c.label.toLowerCase() === label.toLowerCase()
        );
        if (existCred) {
          console.log(`    SKIP credential "${label}" (already exists)`);
          counts.credentialsSkipped++;
          continue;
        }

        // Append number if label already used within this import
        if (usedLabels.has(label.toLowerCase())) {
          let n = 2;
          while (usedLabels.has(`${label.toLowerCase()} (${n})`)) n++;
          label = `${label} (${n})`;
        }
        usedLabels.add(label.toLowerCase());

        const credData = {
          label,
          loginUrl: trimOrNull(loginUrl),
          username: trimOrNull(row.username) || trimOrNull(row.email) || "",
          email: trimOrNull(row.email),
          password: trimOrNull(row.password) || "",
          softwareType: trimOrNull(row.softwareType),
        };

        console.log(`    CREATE credential "${label}" [user=${credData.username}]`);
        counts.credentialsCreated++;
        createdCredentialKeys.add(credKey);

        if (commit) {
          operations.push(async (tx) => {
            const pid = createdPartnerIds.get(partnerKey) || partnerId;
            return tx.credential.create({
              data: { ...credData, partnerId: pid },
            });
          });
        }
      }

      // ── e) Deals ───────────────────────────────────────────────────
      for (const row of group.rows) {
        if (!row.page || !row.position) {
          continue; // skip rows without page or position
        }

        const assetName = row.dealAsset;
        if (!assetName) {
          console.warn(`    WARN: Deal row has page/position but no asset, skipping`);
          continue;
        }

        const assetId = assetByName.get(assetName.toLowerCase());
        if (!assetId) {
          console.warn(`    WARN: Unknown asset "${assetName}", skipping deal`);
          counts.dealsSkipped++;
          continue;
        }

        const pageId = pageByKey.get(`${assetId}|${row.page.toLowerCase()}`);
        if (!pageId) {
          console.warn(`    WARN: Unknown page "${row.page}" on asset "${assetName}", skipping deal`);
          counts.dealsSkipped++;
          continue;
        }

        const positionId = positionByKey.get(`${pageId}|${row.position.toLowerCase()}`);
        if (!positionId) {
          console.warn(`    WARN: Unknown position "${row.position}" on page "${row.page}", skipping deal`);
          counts.dealsSkipped++;
          continue;
        }

        // Check position not already occupied
        if (occupiedPositions.has(positionId)) {
          console.warn(`    WARN: Position "${row.position}" on "${row.page}" (${assetName}) already occupied, skipping deal`);
          counts.dealsSkipped++;
          continue;
        }

        // These deals have positions assigned, so they're Live
        const dealStatus = "Live" as const;
        const partnerIsDirect = existingPartner
          ? existingPartner.isDirect
          : yesNo(firstRow.isDirect);

        const accountManagerId = row.accountManager
          ? userByName.get(row.accountManager.toLowerCase()) || null
          : null;

        // Find the brand for this deal row
        const brandKey = `${partnerKey}|${row.brandName.toLowerCase()}`;

        const geo = trimOrNull(row.dealCountry)?.toUpperCase() || "";
        const startDate = row.startDate ? new Date(row.startDate) : new Date();

        const dealData = {
          assetId,
          pageId,
          positionId,
          geo,
          affiliateLink: fixUrl(trimOrNull(row.affiliateLink)),
          startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
          status: dealStatus,
          isDirect: partnerIsDirect,
          payoutModel: trimOrNull(row.payoutModel),
          payoutValue: trimOrNull(row.payoutValue),
          currency: trimOrNull(row.currency),
          baseline: trimOrNull(row.baseline),
          conversionFlow: trimOrNull(row.conversionFlow),
          cap: trimOrNull(row.cap),
          holdPeriod: trimOrNull(row.holdPeriod),
          hasLocalLicense: yesNo(row.hasLocalLicense),
        };

        console.log(`    CREATE deal [${assetName}/${row.page}/${row.position}] brand="${row.brandName}" status=${dealStatus} geo=${geo}`);
        counts.dealsCreated++;

        // Mark position occupied to prevent duplicates within the import
        occupiedPositions.add(positionId);

        if (commit) {
          const bKey = brandKey;
          operations.push(async (tx) => {
            const pid = createdPartnerIds.get(partnerKey) || partnerId;
            const bid = createdBrandIds.get(bKey);
            if (!bid || bid.startsWith("pending-")) {
              console.error(`    ERROR: Brand ID not resolved for "${row.brandName}" — skipping deal`);
              return;
            }
            const managerId = accountManagerId || users[0]?.id;
            if (!managerId) {
              console.error(`    ERROR: No user found for createdById — skipping deal`);
              return;
            }
            return tx.deal.create({
              data: {
                ...dealData,
                partnerId: pid,
                brandId: bid,
                createdById: managerId,
              },
            });
          });
        }
      }
    }

    // ── Execute ──────────────────────────────────────────────────────
    if (commit) {
      console.log(`\nExecuting ${operations.length} operations in a single transaction...`);
      await prisma.$transaction(
        async (tx) => {
          for (const op of operations) {
            await op(tx);
          }
        },
        { timeout: 60000 } // 60s timeout for large imports
      );
      console.log("Done! All operations committed.");
    }

    // ── Summary ──────────────────────────────────────────────────────
    console.log("\n═══ SUMMARY ═══");
    console.log(`Partners:     ${counts.partnersCreated} created, ${counts.partnersSkipped} skipped`);
    console.log(`Brands:       ${counts.brandsCreated} created, ${counts.brandsSkipped} skipped`);
    console.log(`Contacts:     ${counts.contactsCreated} created, ${counts.contactsSkipped} skipped`);
    console.log(`Credentials:  ${counts.credentialsCreated} created, ${counts.credentialsSkipped} skipped`);
    console.log(`Deals:        ${counts.dealsCreated} created, ${counts.dealsSkipped} skipped`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
