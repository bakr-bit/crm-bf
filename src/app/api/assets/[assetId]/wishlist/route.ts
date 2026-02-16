import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { wishlistItemCreateSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { assetId } = await params;

    const items = await prisma.wishlistItem.findMany({
      where: { assetId },
      orderBy: [{ contacted: "asc" }, { createdAt: "desc" }],
      include: {
        contactedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Wishlist list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist items" },
      { status: 500 }
    );
  }
}

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
    const parsed = wishlistItemCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check asset exists
    const asset = await prisma.asset.findUnique({ where: { assetId } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check unique name per asset
    const existing = await prisma.wishlistItem.findUnique({
      where: { assetId_name: { assetId, name: parsed.data.name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A wishlist item with this name already exists for this asset" },
        { status: 409 }
      );
    }

    const item = await prisma.wishlistItem.create({
      data: {
        assetId,
        name: parsed.data.name,
        description: parsed.data.description,
      },
      include: {
        contactedBy: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId,
      entity: "WishlistItem",
      entityId: item.wishlistItemId,
      action: "CREATE",
      details: { assetId, name: parsed.data.name },
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
