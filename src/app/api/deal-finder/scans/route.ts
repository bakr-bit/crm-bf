import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const scanId = searchParams.get("scanId");

    // Single scan detail
    if (scanId) {
      const scan = await prisma.scanResult.findUnique({
        where: { scanId },
        include: {
          asset: true,
          user: { select: { id: true, name: true } },
          items: {
            include: {
              matchedDeal: {
                include: {
                  partner: true,
                  brand: true,
                  position: true,
                },
              },
              matchedBrand: {
                include: {
                  partner: true,
                },
              },
            },
          },
        },
      });

      if (!scan) {
        return NextResponse.json(
          { error: "Scan not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(scan);
    }

    // Scan list
    const where: Record<string, unknown> = {};
    if (assetId) {
      where.assetId = assetId;
    }

    const scans = await prisma.scanResult.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      take: 20,
      include: {
        asset: { select: { assetId: true, name: true, assetDomain: true } },
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(scans);
  } catch (error) {
    console.error("Scan history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scans" },
      { status: 500 }
    );
  }
}
