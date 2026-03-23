import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    // Fetch current names to determine which are numeric
    const currentPositions = await prisma.position.findMany({
      where: { positionId: { in: orderedIds } },
      select: { positionId: true, name: true },
    });
    const nameMap = new Map(currentPositions.map((p) => [p.positionId, p.name]));

    // Assign sequential numbers to numeric-named positions only
    let counter = 1;
    const updates = orderedIds.map((id, i) => {
      const currentName = nameMap.get(id) ?? "";
      const isNumeric = /^\d+$/.test(currentName);
      const data: { sortOrder: number; name?: string } = { sortOrder: i };
      if (isNumeric) {
        data.name = String(counter);
      }
      counter++;
      return prisma.position.update({ where: { positionId: id }, data });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Position reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder positions" },
      { status: 500 }
    );
  }
}
