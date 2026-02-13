import { prisma } from "./prisma";
import { normalizeName, normalizeDomain } from "./utils";

interface DuplicateMatch {
  partnerId: string;
  name: string;
  websiteDomain: string | null;
  matchType: "name" | "domain" | "both";
}

export async function findDuplicatePartners({
  name,
  websiteDomain,
  excludePartnerId,
}: {
  name: string;
  websiteDomain?: string | null;
  excludePartnerId?: string;
}): Promise<DuplicateMatch[]> {
  const partners = await prisma.partner.findMany({
    where: {
      status: { not: "Archived" },
      ...(excludePartnerId ? { partnerId: { not: excludePartnerId } } : {}),
    },
    select: {
      partnerId: true,
      name: true,
      websiteDomain: true,
    },
  });

  const normalizedInputName = normalizeName(name);
  const normalizedInputDomain = websiteDomain
    ? normalizeDomain(websiteDomain)
    : null;

  const matches: DuplicateMatch[] = [];

  for (const partner of partners) {
    const nameMatch = normalizeName(partner.name) === normalizedInputName;
    const domainMatch =
      normalizedInputDomain &&
      partner.websiteDomain &&
      normalizeDomain(partner.websiteDomain) === normalizedInputDomain;

    if (nameMatch && domainMatch) {
      matches.push({ ...partner, matchType: "both" });
    } else if (nameMatch) {
      matches.push({ ...partner, matchType: "name" });
    } else if (domainMatch) {
      matches.push({ ...partner, matchType: "domain" });
    }
  }

  return matches;
}
