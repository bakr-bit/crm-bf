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
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const searchTerm = q.trim();

    const [partners, brands, assets] = await Promise.all([
      prisma.partner.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { websiteDomain: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          partnerId: true,
          name: true,
          websiteDomain: true,
          status: true,
          isDirect: true,
        },
        take: 5,
        orderBy: { name: "asc" },
      }),
      prisma.brand.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { brandDomain: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          brandId: true,
          name: true,
          brandDomain: true,
          status: true,
          partner: {
            select: { partnerId: true, name: true },
          },
        },
        take: 5,
        orderBy: { name: "asc" },
      }),
      prisma.asset.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { assetDomain: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          assetId: true,
          name: true,
          assetDomain: true,
          _count: {
            select: { pages: true },
          },
        },
        take: 5,
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      partners,
      brands,
      assets,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
