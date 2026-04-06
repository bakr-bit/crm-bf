import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";
import { z } from "zod";

const bulkEndSchema = z.object({
  dealIds: z.array(z.string()).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId } = await params;
    const body = await request.json();
    const parsed = bulkEndSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dealIds } = parsed.data;

    // Verify all deals belong to this asset and are active
    const deals = await prisma.deal.findMany({
      where: {
        dealId: { in: dealIds },
        assetId,
        status: { in: OCCUPYING_STATUSES },
      },
      include: {
        brand: { select: { name: true } },
        position: { select: { name: true } },
      },
    });

    if (deals.length !== dealIds.length) {
      return NextResponse.json(
        { error: "Some deals were not found, don't belong to this asset, or are already inactive" },
        { status: 400 }
      );
    }

    // Bulk update all deals to Inactive
    await prisma.deal.updateMany({
      where: { dealId: { in: dealIds } },
      data: {
        status: "Inactive",
        endDate: new Date(),
      },
    });

    // Log audit for each deal
    await Promise.all(
      deals.map((deal) =>
        logAudit({
          userId,
          entity: "Deal",
          entityId: deal.dealId,
          action: "UPDATE",
          details: {
            bulkAction: "BULK_END_FOR_ASSET_DELETION",
            previousStatus: deal.status,
            newStatus: "Inactive",
            brandName: deal.brand.name,
            positionName: deal.position?.name ?? null,
          },
        })
      )
    );

    return NextResponse.json({ success: true, endedCount: deals.length });
  } catch (error) {
    console.error("Bulk end deals error:", error);
    return NextResponse.json(
      { error: "Failed to end deals" },
      { status: 500 }
    );
  }
}
