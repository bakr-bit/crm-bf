import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STATUSES } from "@/lib/deal-status";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [totalPartners, liveDeals, totalAssets, pipelineDeals, recentAuditLogs] =
      await Promise.all([
        prisma.partner.count(),
        prisma.deal.count({ where: { status: "Live" } }),
        prisma.asset.count(),
        prisma.deal.count({ where: { status: { in: PIPELINE_STATUSES } } }),
        prisma.auditLog.findMany({
          where: {
            action: {
              in: [
                "CREATE",
                "UPDATE",
                "ARCHIVE",
                "CREATE_REPLACEMENT",
                "ENDED_BY_REPLACEMENT",
                "ENDED_BY_SCAN",
                "CREATE_FROM_SCAN",
                "CREDENTIAL_ACCESS",
              ],
            },
          },
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
        liveDeals,
        totalAssets,
        pipelineDeals,
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
