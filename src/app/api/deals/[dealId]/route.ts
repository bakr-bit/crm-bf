import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { dealUpdateSchema } from "@/lib/validations";
import { createNotificationForAllUsers } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { dealId } = await params;

    const deal = await prisma.deal.findUnique({
      where: { dealId },
      include: {
        partner: true,
        brand: true,
        asset: true,
        page: true,
        position: true,
        affiliateLinkRef: {
          select: { affiliateLinkId: true, label: true, url: true, geo: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
        replacedDeal: {
          select: {
            dealId: true,
            partner: { select: { name: true } },
            brand: { select: { name: true } },
            status: true,
          },
        },
        replacedBy: {
          select: {
            dealId: true,
            partner: { select: { name: true } },
            brand: { select: { name: true } },
            status: true,
          },
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    const isAdmin = session?.user?.isAdmin ?? false;
    if (!isAdmin && deal.adminOnly) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Deal get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deal" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { dealId } = await params;
    const body = await request.json();
    const parsed = dealUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.deal.findUnique({
      where: { dealId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updatedById: userId,
    };

    // Validate affiliate link if provided
    if (parsed.data.affiliateLinkId) {
      const affLink = await prisma.affiliateLink.findUnique({
        where: { affiliateLinkId: parsed.data.affiliateLinkId },
      });
      if (!affLink || affLink.brandId !== existing.brandId) {
        return NextResponse.json(
          { error: "Affiliate link not found or does not belong to this brand" },
          { status: 400 }
        );
      }
      updateData.affiliateLink = affLink.url;
    } else if (parsed.data.affiliateLinkId === null) {
      updateData.affiliateLinkId = null;
    }

    // If status changed to "Inactive", set endDate to now
    if (parsed.data.status === "Inactive" && existing.status !== "Inactive") {
      updateData.endDate = new Date();
    }

    const deal = await prisma.deal.update({
      where: { dealId },
      data: updateData,
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

    await logAudit({
      userId,
      entity: "Deal",
      entityId: dealId,
      action: "UPDATE",
      details: {
        updatedFields: Object.keys(parsed.data),
        previousStatus: existing.status,
        newStatus: parsed.data.status ?? existing.status,
      },
    });

    // Notify if deal was set to Inactive — position is now available
    if (parsed.data.status === "Inactive" && existing.status !== "Inactive") {
      createNotificationForAllUsers({
        type: "POSITION_AVAILABLE",
        title: "Position Available",
        message: `${deal.position?.name ?? "No position"} on ${deal.asset.name} is now available (deal with ${deal.brand.name} ended)`,
        entityType: "Deal",
        entityId: deal.dealId,
      }).catch(() => {});
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Deal update error:", error);
    return NextResponse.json(
      { error: "Failed to update deal" },
      { status: 500 }
    );
  }
}
