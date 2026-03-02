import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { assetCreateSchema } from "@/lib/validations";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const includeArchived = searchParams.get("includeArchived") === "true";

    const where: Record<string, unknown> = {};

    if (!includeArchived) {
      where.status = "Active";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { assetDomain: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            pages: true,
          },
        },
        pages: {
          where: { status: "Active" },
          select: {
            pageId: true,
            positions: {
              where: { status: "Active" },
              select: {
                positionId: true,
                deals: {
                  where: { status: { in: OCCUPYING_STATUSES } },
                  select: { dealId: true },
                },
              },
            },
          },
        },
      },
    });

    const result = assets.map((asset) => {
      const allPositions = asset.pages.flatMap((p) => p.positions);
      const totalPositionCount = allPositions.length;
      const activePositionCount = allPositions.filter(
        (p) => p.deals.length > 0
      ).length;

      const { pages, ...rest } = asset;
      return {
        ...rest,
        _count: { positions: totalPositionCount },
        activePositionCount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Assets list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
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
    const parsed = assetCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate domain
    if (data.assetDomain) {
      const existing = await prisma.asset.findUnique({
        where: { assetDomain: data.assetDomain },
      });
      if (existing) {
        return NextResponse.json(
          {
            error: "An asset with this domain already exists",
            existingAsset: { assetId: existing.assetId, name: existing.name },
          },
          { status: 409 }
        );
      }
    }

    const asset = await prisma.$transaction(async (tx) => {
      const newAsset = await tx.asset.create({
        data: {
          name: data.name,
          assetDomain: data.assetDomain,
          description: data.description,
          geos: data.geos,
          status: "Active",
        },
      });

      // Auto-create Homepage page
      const homepage = await tx.page.create({
        data: {
          assetId: newAsset.assetId,
          name: "Homepage",
          path: "/",
        },
      });

      // Auto-create N/A position on Homepage
      await tx.position.create({
        data: {
          pageId: homepage.pageId,
          name: "N/A",
        },
      });

      return newAsset;
    });

    await logAudit({
      userId,
      entity: "Asset",
      entityId: asset.assetId,
      action: "CREATE",
      details: { name: asset.name },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Asset create error:", error);
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}
