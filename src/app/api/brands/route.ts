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
    const geo = searchParams.get("geo");

    const where: Record<string, unknown> = {
      status: "Active",
      partner: { status: "Active" },
    };

    if (geo) {
      where.targetGeos = { has: geo };
    }

    const brands = await prisma.brand.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        partner: { select: { partnerId: true, name: true } },
        _count: {
          select: { deals: true },
        },
      },
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error("Brands list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
