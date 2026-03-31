import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";
import { z } from "zod";

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ assetId: string; pageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session?.user?.id;

  try {
    const { assetId, pageId } = await params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orderedIds } = parsed.data;

    // Verify page belongs to asset
    const page = await prisma.page.findFirst({
      where: { pageId, assetId },
      include: { asset: { select: { name: true } } },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // Verify all positions belong to this page
    const positions = await prisma.position.findMany({
      where: { positionId: { in: orderedIds }, pageId },
      select: { positionId: true },
    });

    if (positions.length !== orderedIds.length) {
      return NextResponse.json(
        { error: "Some position IDs are invalid or don't belong to this page" },
        { status: 400 }
      );
    }

    // Fetch current positions with their names, sortOrder, and active deals
    const currentPositions = await prisma.position.findMany({
      where: { positionId: { in: orderedIds } },
      select: {
        positionId: true,
        name: true,
        sortOrder: true,
        deals: {
          where: { status: { in: OCCUPYING_STATUSES } },
          select: {
            dealId: true,
            brand: { select: { brandId: true, name: true } },
          },
          take: 1,
        },
      },
    });
    const posMap = new Map(currentPositions.map((p) => [p.positionId, p]));

    // Build before-state for audit
    const beforeState = orderedIds.map((id) => {
      const p = posMap.get(id);
      return {
        positionId: id,
        name: p?.name ?? "",
        sortOrder: p?.sortOrder ?? 0,
        brandName: p?.deals[0]?.brand.name ?? null,
        brandId: p?.deals[0]?.brand.brandId ?? null,
      };
    });

    // Assign sequential numbers to numeric-named positions only
    let counter = 1;
    const afterState: { positionId: string; name: string; sortOrder: number }[] = [];
    const updates = orderedIds.map((id, i) => {
      const currentName = posMap.get(id)?.name ?? "";
      const isNumeric = /^\d+$/.test(currentName);
      const newName = isNumeric ? String(counter) : currentName;
      const data: { sortOrder: number; name?: string } = { sortOrder: i };
      if (isNumeric) {
        data.name = String(counter);
      }
      afterState.push({ positionId: id, name: newName, sortOrder: i });
      counter++;
      return prisma.position.update({ where: { positionId: id }, data });
    });

    await prisma.$transaction(updates);

    // Log audit entries for positions that actually changed
    if (userId) {
      const changes = beforeState
        .map((before) => {
          const after = afterState.find((a) => a.positionId === before.positionId);
          if (!after || (before.name === after.name && before.sortOrder === after.sortOrder)) {
            return null;
          }
          return {
            positionId: before.positionId,
            fromPosition: before.name,
            toPosition: after.name,
            brandName: before.brandName,
            brandId: before.brandId,
          };
        })
        .filter(Boolean);

      if (changes.length > 0) {
        await logAudit({
          userId,
          entity: "Page",
          entityId: pageId,
          action: "REORDER",
          details: {
            assetId,
            assetName: page.asset.name,
            pageName: page.name,
            changes,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Position reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder positions" },
      { status: 500 }
    );
  }
}
