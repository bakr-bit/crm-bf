import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const geo = searchParams.get("geo")?.toUpperCase() || null;

    // Find all active positions with their pages/assets and occupying deals
    const positions = await prisma.position.findMany({
      where: { status: "Active" },
      include: {
        page: {
          select: {
            pageId: true,
            name: true,
            asset: {
              select: {
                assetId: true,
                name: true,
                assetDomain: true,
                status: true,
              },
            },
          },
        },
        deals: {
          where: { status: { in: OCCUPYING_STATUSES } },
          select: {
            dealId: true,
            geo: true,
            status: true,
            partner: { select: { partnerId: true, name: true } },
            brand: { select: { brandId: true, name: true } },
          },
        },
      },
      orderBy: [
        { page: { asset: { name: "asc" } } },
        { name: "asc" },
      ],
    });

    // Filter to only active assets and reshape for backward compatibility
    const activePositions = positions
      .filter((p) => p.page.asset.status === "Active")
      .map((p) => ({
        ...p,
        asset: p.page.asset,
      }));

    // If geo filter is set, only return positions that are open for that geo
    if (geo) {
      const openForGeo = activePositions.filter(
        (p) => !p.deals.some((d) => d.geo === geo)
      );
      return NextResponse.json(openForGeo);
    }

    // No geo filter: return all positions, marking which have deals
    return NextResponse.json(activePositions);
  } catch (error) {
    console.error("Open positions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch open positions" },
      { status: 500 }
    );
  }
}
