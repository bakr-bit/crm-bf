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
    const [totalPartners, activeDeals, totalAssets, pendingValidationDeals, recentAuditLogs] =
      await Promise.all([
        prisma.partner.count(),
        prisma.deal.count({ where: { status: "Active" } }),
        prisma.asset.count(),
        prisma.deal.count({ where: { status: "PendingValidation" } }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { timestamp: "desc" },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
      ]);

    return NextResponse.json({
      stats: {
        totalPartners,
        activeDeals,
        totalAssets,
        pendingValidationDeals,
      },
      recentAuditLogs,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
