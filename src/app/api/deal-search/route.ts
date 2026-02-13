import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const geo = searchParams.get("geo");
    const ownerUserId = searchParams.get("ownerUserId");
    const hasLicense = searchParams.get("hasLicense");
    const status = searchParams.get("status");
    const isDirect = searchParams.get("isDirect");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: Record<string, unknown> = {};

    if (geo) {
      where.geo = geo;
    }

    // Status filter: default to Active + PendingValidation unless specific status or includeInactive
    if (status) {
      where.status = status;
    } else if (includeInactive) {
      // No status filter — include all
    } else {
      where.status = { in: ["Active", "PendingValidation"] };
    }

    // Partner-level filters via relation
    const partnerWhere: Record<string, unknown> = {};
    if (ownerUserId) {
      partnerWhere.ownerUserId = ownerUserId;
    }
    if (hasLicense === "yes") {
      partnerWhere.hasLicense = true;
    } else if (hasLicense === "no") {
      partnerWhere.hasLicense = false;
    }
    if (isDirect === "yes") {
      where.isDirect = true;
    } else if (isDirect === "no") {
      where.isDirect = false;
    }

    if (Object.keys(partnerWhere).length > 0) {
      where.partner = partnerWhere;
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        partner: {
          select: {
            partnerId: true,
            name: true,
            hasLicense: true,
            isDirect: true,
            ownerUserId: true,
          },
        },
        brand: { select: { brandId: true, name: true } },
        asset: { select: { assetId: true, name: true } },
        position: { select: { positionId: true, name: true } },
      },
    });

    // Sort: licensed partners first, then by partner name
    deals.sort((a, b) => {
      if (a.partner.hasLicense !== b.partner.hasLicense) {
        return a.partner.hasLicense ? -1 : 1;
      }
      return a.partner.name.localeCompare(b.partner.name);
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error("Deal search error:", error);
    return NextResponse.json(
      { error: "Failed to search deals" },
      { status: 500 }
    );
  }
}
