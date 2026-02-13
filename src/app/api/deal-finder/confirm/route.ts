import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { confirmScanItemSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const body = await request.json();
    const parsed = confirmScanItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { itemId, action, partnerId, brandId, positionId } = parsed.data;

    const item = await prisma.scanResultItem.findUnique({
      where: { itemId },
      include: {
        scan: true,
        matchedDeal: {
          include: { partner: true, brand: true },
        },
        matchedBrand: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Scan item not found" },
        { status: 404 }
      );
    }

    if (item.action !== "Pending") {
      return NextResponse.json(
        { error: "Item already processed" },
        { status: 400 }
      );
    }

    // Ignored — just mark and return
    if (action === "Ignored") {
      const updated = await prisma.scanResultItem.update({
        where: { itemId },
        data: { action: "Ignored" },
      });
      return NextResponse.json(updated);
    }

    // Confirmed actions based on type
    if (item.type === "Missing" && item.matchedDealId) {
      // End the matched deal
      await prisma.$transaction(async (tx) => {
        await tx.deal.update({
          where: { dealId: item.matchedDealId! },
          data: {
            status: "Inactive",
            endDate: new Date(),
            updatedById: userId,
          },
        });

        await tx.scanResultItem.update({
          where: { itemId },
          data: { action: "Confirmed" },
        });

        await tx.auditLog.create({
          data: {
            userId,
            entity: "Deal",
            entityId: item.matchedDealId!,
            action: "ENDED_BY_SCAN",
            details: { scanId: item.scanId, reason: "Link not found on page" },
          },
        });
      });

      return NextResponse.json({ success: true, action: "deal_ended" });
    }

    if (item.type === "NewUnmatched") {
      // Create a new deal — requires partnerId, brandId, positionId
      if (!partnerId || !brandId || !positionId) {
        return NextResponse.json(
          {
            error:
              "partnerId, brandId, and positionId are required to create a deal from a new link",
          },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // Verify brand belongs to partner
        const brand = await tx.brand.findUnique({
          where: { brandId },
        });
        if (!brand || brand.partnerId !== partnerId) {
          throw new Error("BRAND_PARTNER_MISMATCH");
        }

        // Check position not occupied
        const existingDeal = await tx.deal.findFirst({
          where: { positionId, status: { in: ["Unsure", "InContact", "Approved", "AwaitingPostback", "FullyImplemented", "Live"] } },
        });
        if (existingDeal) {
          throw new Error("POSITION_OCCUPIED");
        }

        // SOP check
        const partner = await tx.partner.findUnique({
          where: { partnerId },
        });
        if (!partner) throw new Error("PARTNER_NOT_FOUND");

        let dealStatus: "Live" | "Approved" = "Live";
        if (
          partner.isDirect &&
          !(partner.hasContract && partner.hasLicense && partner.hasBanking)
        ) {
          dealStatus = "Approved";
        }

        const newDeal = await tx.deal.create({
          data: {
            partnerId,
            brandId,
            assetId: item.scan.assetId,
            positionId,
            affiliateLink: item.foundUrl,
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

        await tx.scanResultItem.update({
          where: { itemId },
          data: { action: "Confirmed", matchedDealId: newDeal.dealId },
        });

        await tx.auditLog.create({
          data: {
            userId,
            entity: "Deal",
            entityId: newDeal.dealId,
            action: "CREATE_FROM_SCAN",
            details: { scanId: item.scanId, foundUrl: item.foundUrl },
          },
        });

        return newDeal;
      });

      return NextResponse.json(
        { success: true, action: "deal_created", deal: result },
        { status: 201 }
      );
    }

    // Verified / Replacement — just acknowledge
    const updated = await prisma.scanResultItem.update({
      where: { itemId },
      data: { action: "Confirmed" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Confirm scan item error:", error);

    if (error instanceof Error) {
      switch (error.message) {
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
      { error: "Failed to confirm scan item" },
      { status: 500 }
    );
  }
}
