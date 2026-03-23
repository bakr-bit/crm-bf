import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { dealCreateSchema } from "@/lib/validations";
import { createNotificationForAllUsers } from "@/lib/notifications";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";
import { adminOnlyFilter } from "@/lib/admin-only";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const partnerId = searchParams.get("partnerId");
    const brandId = searchParams.get("brandId");
    const assetId = searchParams.get("assetId");
    const geo = searchParams.get("geo");
    const search = searchParams.get("search");
    const accountManagerUserId = searchParams.get("accountManagerUserId");
    const hasLicense = searchParams.get("hasLicense");
    const isDirect = searchParams.get("isDirect");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const isAdmin = session?.user?.isAdmin ?? false;
    const adminFilter = adminOnlyFilter(isAdmin);
    const where: Record<string, unknown> = {
      ...adminFilter,
    };

    if (status) {
      where.status = status;
    } else if (!includeInactive) {
      // By default exclude Inactive deals unless a specific status or includeInactive is set
      where.status = { not: "Inactive" };
    }
    if (partnerId) {
      where.partnerId = partnerId;
    }
    if (brandId) {
      where.brandId = brandId;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    if (geo) {
      where.geo = geo;
    }
    if (accountManagerUserId) {
      where.partner = { ...(where.partner as Record<string, unknown> ?? {}), accountManagerUserId };
    }
    if (hasLicense === "yes") {
      where.brand = { ...(where.brand as Record<string, unknown> ?? {}), licenses: { isEmpty: false } };
    } else if (hasLicense === "no") {
      where.brand = { ...(where.brand as Record<string, unknown> ?? {}), licenses: { isEmpty: true } };
    }
    if (isDirect === "yes") {
      where.isDirect = true;
    } else if (isDirect === "no") {
      where.isDirect = false;
    }
    if (search) {
      where.OR = [
        { brand: { name: { contains: search, mode: "insensitive" } } },
        { partner: { name: { contains: search, mode: "insensitive" } } },
        { asset: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Filter out deals whose related entities are admin-only (for non-admins)
    if (!isAdmin) {
      where.partner = { ...(where.partner as Record<string, unknown> ?? {}), ...adminFilter };
      where.brand = { ...(where.brand as Record<string, unknown> ?? {}), ...adminFilter };
      where.asset = { ...(where.asset as Record<string, unknown> ?? {}), ...adminFilter };
    }

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        partner: {
          include: {
            accountManager: { select: { id: true, name: true, email: true } },
          },
        },
        brand: true,
        asset: true,
        page: true,
        position: true,
        affiliateLinkRef: {
          select: { affiliateLinkId: true, label: true, url: true, geo: true },
        },
      },
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error("Deals list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const body = await request.json();
    const parsed = dealCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    // forceInactive is legacy — status is now user-chosen via data.status

    const deal = await prisma.$transaction(async (tx) => {
      // 1. Verify brand belongs to partner
      const brand = await tx.brand.findUnique({
        where: { brandId: data.brandId },
      });

      if (!brand) {
        throw new Error("BRAND_NOT_FOUND");
      }

      if (brand.partnerId !== data.partnerId) {
        throw new Error("BRAND_PARTNER_MISMATCH");
      }

      // 2. Validate affiliate link if provided
      let resolvedAffiliateLink = data.affiliateLink;
      if (data.affiliateLinkId) {
        const affLink = await tx.affiliateLink.findUnique({
          where: { affiliateLinkId: data.affiliateLinkId },
        });
        if (!affLink) {
          throw new Error("AFFILIATE_LINK_NOT_FOUND");
        }
        if (affLink.brandId !== data.brandId) {
          throw new Error("AFFILIATE_LINK_BRAND_MISMATCH");
        }
        resolvedAffiliateLink = affLink.url;
      }

      // 3. Check position not occupied (skip for N/A positions or Inactive deals)
      if (data.positionId) {
        const position = await tx.position.findUnique({
          where: { positionId: data.positionId },
        });

        const isNAPosition = position?.name === "N/A";
        const isOccupyingStatus = OCCUPYING_STATUSES.includes(data.status as typeof OCCUPYING_STATUSES[number]);

        if (!isNAPosition && isOccupyingStatus) {
          const existingActiveDeal = await tx.deal.findFirst({
            where: {
              positionId: data.positionId,
              status: { in: OCCUPYING_STATUSES },
            },
          });

          if (existingActiveDeal) {
            throw new Error("POSITION_OCCUPIED");
          }
        }
      }

      // 4. Check if partner isDirect and SOP incomplete
      const partner = await tx.partner.findUnique({
        where: { partnerId: data.partnerId },
      });

      if (!partner) {
        throw new Error("PARTNER_NOT_FOUND");
      }

      // Use user-chosen status (defaults to Inactive via schema)
      const dealStatus = data.status;

      // 5. Create deal
      const newDeal = await tx.deal.create({
        data: {
          partnerId: data.partnerId,
          brandId: data.brandId,
          assetId: data.assetId,
          pageId: data.pageId,
          positionId: data.positionId || null,
          geo: data.geo,
          affiliateLink: resolvedAffiliateLink,
          affiliateLinkId: data.affiliateLinkId || null,
          startDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
          status: dealStatus,
          isDirect: partner.isDirect,
          createdById: userId,
          dealTerms: data.dealTerms,
        },
        include: {
          partner: true,
          brand: true,
          asset: true,
          page: true,
          position: true,
          affiliateLinkRef: {
            select: { affiliateLinkId: true, label: true, url: true, geo: true },
          },
        },
      });

      // 5. Audit log inside transaction
      await tx.auditLog.create({
        data: {
          userId,
          entity: "Deal",
          entityId: newDeal.dealId,
          action: "CREATE",
          details: {
            partnerId: data.partnerId,
            brandId: data.brandId,
            assetId: data.assetId,
            pageId: data.pageId,
            positionId: data.positionId,
            geo: data.geo,
            status: dealStatus,
          },
        },
      });

      return newDeal;
    });

    // Fire-and-forget notification
    createNotificationForAllUsers({
      type: "DEAL_CREATED",
      title: "New Deal Created",
      message: `Deal created for ${deal.brand.name} on ${deal.asset.name}${deal.position ? ` — ${deal.position.name}` : ""}`,
      entityType: "Deal",
      entityId: deal.dealId,
    }).catch(() => {});

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error("Deal create error:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "BRAND_NOT_FOUND":
          return NextResponse.json(
            { error: "Brand not found" },
            { status: 404 }
          );
        case "BRAND_PARTNER_MISMATCH":
          return NextResponse.json(
            { error: "Brand does not belong to the specified partner" },
            { status: 400 }
          );
        case "AFFILIATE_LINK_NOT_FOUND":
          return NextResponse.json(
            { error: "Affiliate link not found" },
            { status: 404 }
          );
        case "AFFILIATE_LINK_BRAND_MISMATCH":
          return NextResponse.json(
            { error: "Affiliate link does not belong to the specified brand" },
            { status: 400 }
          );
        case "POSITION_OCCUPIED":
          return NextResponse.json(
            { error: "Position is already occupied by an active deal" },
            { status: 409 }
          );
        case "PARTNER_NOT_FOUND":
          return NextResponse.json(
            { error: "Partner not found" },
            { status: 404 }
          );
      }
    }

    return NextResponse.json(
      { error: "Failed to create deal" },
      { status: 500 }
    );
  }
}
