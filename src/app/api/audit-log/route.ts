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
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const entityId = searchParams.get("entityId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const businessOnly = searchParams.get("businessOnly") !== "false";

    const where: Record<string, unknown> = {};

    if (entity) {
      where.entity = entity;
    }
    if (action) {
      where.action = action;
    }
    if (entityId) {
      where.entityId = entityId;
    }

    // Filter to business-relevant actions by default
    if (businessOnly && !action) {
      where.action = {
        in: [
          "CREATE",
          "UPDATE",
          "ARCHIVE",
          "CREATE_REPLACEMENT",
          "ENDED_BY_REPLACEMENT",
          "ENDED_BY_SCAN",
          "CREATE_FROM_SCAN",
        ],
      };
    }

    // Date range filters
    if (dateFrom || dateTo) {
      const timestampFilter: Record<string, Date> = {};
      if (dateFrom) timestampFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        timestampFilter.lte = end;
      }
      where.timestamp = timestampFilter;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Audit log list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
