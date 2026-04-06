import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { positionConvertSchema } from "@/lib/validations";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assetId: string; pageId: string; positionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId, pageId, positionId } = await params;
    const body = await request.json();
    const parsed = positionConvertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.position.findFirst({
      where: { positionId, pageId, page: { assetId } },
      include: {
        deals: {
          where: { status: { in: OCCUPYING_STATUSES } },
          select: { dealId: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    if (existing.name !== "N/A") {
      return NextResponse.json(
        { error: "Only N/A positions can be converted" },
        { status: 400 }
      );
    }

    const { converted, newNA } = await prisma.$transaction(async (tx) => {
      // Rename the existing N/A position in-place (deals stay linked)
      const converted = await tx.position.update({
        where: { positionId },
        data: {
          name: parsed.data.name,
          details: parsed.data.details,
        },
      });

      // Create a replacement N/A position
      const maxSort = await tx.position.aggregate({
        where: { pageId },
        _max: { sortOrder: true },
      });

      const newNA = await tx.position.create({
        data: {
          pageId,
          name: "N/A",
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });

      return { converted, newNA };
    });

    await logAudit({
      userId,
      entity: "Position",
      entityId: positionId,
      action: "CONVERT",
      details: {
        previousName: "N/A",
        newName: parsed.data.name,
        newNAPositionId: newNA.positionId,
        dealsOnPosition: existing.deals.length,
        pageId,
        assetId,
      },
    });

    return NextResponse.json({ converted, newNA });
  } catch (error) {
    console.error("Position convert error:", error);
    return NextResponse.json(
      { error: "Failed to convert position" },
      { status: 500 }
    );
  }
}
