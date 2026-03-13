import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { wishlistItemCreateSchema } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const contactedFilter = searchParams.get("contacted");
    const search = searchParams.get("search");

    const where: Prisma.WishlistItemWhereInput = {};

    if (contactedFilter === "true") {
      where.contacted = true;
    } else if (contactedFilter === "false") {
      where.contacted = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.wishlistItem.findMany({
      where,
      orderBy: [{ contacted: "asc" }, { createdAt: "desc" }],
      include: {
        asset: { select: { assetId: true, name: true, assetDomain: true } },
        contactedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Global wishlist list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist items" },
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
    const parsed = wishlistItemCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, geo, assetId, description, notes, assignedToUserId } = parsed.data;

    // If assetId provided, verify it exists and check uniqueness
    if (assetId) {
      const asset = await prisma.asset.findUnique({ where: { assetId } });
      if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      const existing = await prisma.wishlistItem.findUnique({
        where: { assetId_name: { assetId, name } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A wishlist item with this name already exists for this asset" },
          { status: 409 }
        );
      }
    }

    const item = await prisma.wishlistItem.create({
      data: {
        name,
        geo,
        assetId: assetId || null,
        description,
        notes,
        assignedToUserId,
      },
      include: {
        asset: { select: { assetId: true, name: true, assetDomain: true } },
        contactedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId,
      entity: "WishlistItem",
      entityId: item.wishlistItemId,
      action: "CREATE",
      details: { name, geo, assetId: assetId || null },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Wishlist create error:", error);
    return NextResponse.json(
      { error: "Failed to create wishlist item" },
      { status: 500 }
    );
  }
}
