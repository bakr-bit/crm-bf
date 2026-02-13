import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { dealCreateSchema } from "@/lib/validations";
import { createNotificationForAllUsers } from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const partnerId = searchParams.get("partnerId");
    const assetId = searchParams.get("assetId");
    const geo = searchParams.get("geo");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (partnerId) {
      where.partnerId = partnerId;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    if (geo) {
      where.geo = geo;
    }

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        partner: true,
        brand: true,
        asset: true,
        position: true,
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

      // 2. Check position not occupied by active deal
      const existingActiveDeal = await tx.deal.findFirst({
        where: {
          positionId: data.positionId,
          status: "Active",
        },
      });

      if (existingActiveDeal) {
        throw new Error("POSITION_OCCUPIED");
      }

      // 3. Check if partner isDirect and SOP incomplete
      const partner = await tx.partner.findUnique({
        where: { partnerId: data.partnerId },
      });

      if (!partner) {
        throw new Error("PARTNER_NOT_FOUND");
      }

      let dealStatus: "Active" | "PendingValidation" = "Active";

      if (
        partner.isDirect &&
        !(partner.hasContract && partner.hasLicense && partner.hasBanking)
      ) {
        dealStatus = "PendingValidation";
      }

      // 4. Create deal
      const newDeal = await tx.deal.create({
        data: {
          partnerId: data.partnerId,
          brandId: data.brandId,
          assetId: data.assetId,
          positionId: data.positionId,
          geo: data.geo,
          affiliateLink: data.affiliateLink,
          startDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
          status: dealStatus,
          isDirect: partner.isDirect,
          createdById: userId,
        },
        include: {
          partner: true,
          brand: true,
          asset: true,
          position: true,
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
      message: `Deal created for ${deal.brand.name} on ${deal.asset.name} — ${deal.position.name}`,
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
