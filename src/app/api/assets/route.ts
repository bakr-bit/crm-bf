import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { assetCreateSchema } from "@/lib/validations";

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
            positions: true,
          },
        },
        positions: {
          select: {
            positionId: true,
            deals: {
              where: { status: "Active" },
              select: { dealId: true },
            },
          },
        },
      },
    });

    const result = assets.map((asset) => {
      const activePositionCount = asset.positions.filter(
        (p) => p.deals.length > 0
      ).length;

      const { positions, ...rest } = asset;
      return {
        ...rest,
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

    const asset = await prisma.asset.create({
      data: {
        name: data.name,
        assetDomain: data.assetDomain,
        description: data.description,
      },
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
