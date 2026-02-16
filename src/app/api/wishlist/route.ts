import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
