import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dealReplaceSchema } from "@/lib/validations";
import { createNotificationForAllUsers } from "@/lib/notifications";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const body = await request.json();
    const parsed = dealReplaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find existing deal and verify it's Active
      const existingDeal = await tx.deal.findUnique({
        where: { dealId: data.existingDealId },
      });

      if (!existingDeal) {
        throw new Error("DEAL_NOT_FOUND");
      }

      if (existingDeal.status !== "Active") {
        throw new Error("DEAL_NOT_ACTIVE");
      }

      // Verify brand belongs to partner
      const brand = await tx.brand.findUnique({
        where: { brandId: data.brandId },
      });

      if (!brand) {
        throw new Error("BRAND_NOT_FOUND");
      }

      if (brand.partnerId !== data.partnerId) {
        throw new Error("BRAND_PARTNER_MISMATCH");
      }

      // 2. End old deal
      const endedDeal = await tx.deal.update({
        where: { dealId: data.existingDealId },
        data: {
          status: "Ended",
          endDate: new Date(),
          updatedById: userId,
        },
      });

      // 3-5. Check if new partner isDirect with incomplete SOP -> PendingValidation
      const newPartner = await tx.partner.findUnique({
        where: { partnerId: data.partnerId },
      });

      if (!newPartner) {
        throw new Error("PARTNER_NOT_FOUND");
      }

      let dealStatus: "Active" | "PendingValidation" = "Active";

      if (
        newPartner.isDirect &&
        !(newPartner.hasContract && newPartner.hasLicense && newPartner.hasBanking)
      ) {
        dealStatus = "PendingValidation";
      }

      // Create new deal on same asset/position with new partner/brand
      const newDeal = await tx.deal.create({
        data: {
          partnerId: data.partnerId,
          brandId: data.brandId,
          assetId: existingDeal.assetId,
          positionId: existingDeal.positionId,
          geo: data.geo ?? existingDeal.geo,
          affiliateLink: data.affiliateLink,
          startDate: new Date(),
          notes: data.notes,
          status: dealStatus,
          isDirect: newPartner.isDirect,
          replacedDealId: existingDeal.dealId,
          createdById: userId,
        },
        include: {
          partner: true,
          brand: true,
          asset: true,
          position: true,
        },
      });

      // Audit log both actions
      await tx.auditLog.create({
        data: {
          userId,
          entity: "Deal",
          entityId: endedDeal.dealId,
          action: "ENDED_BY_REPLACEMENT",
          details: {
            replacedByDealId: newDeal.dealId,
            newPartnerId: data.partnerId,
            newBrandId: data.brandId,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          entity: "Deal",
          entityId: newDeal.dealId,
          action: "CREATE_REPLACEMENT",
          details: {
            replacedDealId: existingDeal.dealId,
            previousPartnerId: existingDeal.partnerId,
            previousBrandId: existingDeal.brandId,
            status: dealStatus,
          },
        },
      });

      return { endedDeal, newDeal };
    });

    // Fire-and-forget notification
    createNotificationForAllUsers({
      type: "DEAL_REPLACED",
      title: "Deal Replaced",
      message: `Deal on ${result.newDeal.asset.name} — ${result.newDeal.position.name} replaced with ${result.newDeal.brand.name}`,
      entityType: "Deal",
      entityId: result.newDeal.dealId,
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Deal replace error:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "DEAL_NOT_FOUND":
          return NextResponse.json(
            { error: "Existing deal not found" },
            { status: 404 }
          );
        case "DEAL_NOT_ACTIVE":
          return NextResponse.json(
            { error: "Existing deal is not active" },
            { status: 400 }
          );
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
        case "PARTNER_NOT_FOUND":
          return NextResponse.json(
            { error: "Partner not found" },
            { status: 404 }
          );
      }
    }

    return NextResponse.json(
      { error: "Failed to replace deal" },
      { status: 500 }
    );
  }
}
