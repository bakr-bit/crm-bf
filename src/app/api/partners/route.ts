import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { partnerCreateSchema } from "@/lib/validations";
import { findDuplicatePartners } from "@/lib/dedup";
import { createNotificationForAllUsers } from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const isDirect = searchParams.get("isDirect");
    const showArchived = searchParams.get("showArchived");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { websiteDomain: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (status) {
      where.status = status;
    } else if (showArchived !== "true") {
      where.status = { not: "Archived" };
    }

    if (isDirect === "true") {
      where.isDirect = true;
    } else if (isDirect === "false") {
      where.isDirect = false;
    }

    const partners = await prisma.partner.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            brands: true,
            contacts: true,
            deals: true,
          },
        },
      },
    });

    return NextResponse.json(partners);
  } catch (error) {
    console.error("Partners list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch partners" },
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
    const parsed = partnerCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { force, ...partnerData } = parsed.data;

    // Dedup check unless force-creating
    if (!force) {
      const duplicates = await findDuplicatePartners({
        name: partnerData.name,
        websiteDomain: partnerData.websiteDomain,
      });
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: "Potential duplicate partner found",
            code: "DUPLICATE_PARTNER",
            duplicates,
          },
          { status: 409 }
        );
      }
    }

    const partner = await prisma.partner.create({
      data: {
        name: partnerData.name,
        websiteDomain: partnerData.websiteDomain,
        isDirect: partnerData.isDirect,
        status: partnerData.status,
        hasContract: partnerData.hasContract,
        hasLicense: partnerData.hasLicense,
        hasBanking: partnerData.hasBanking,
        sopNotes: partnerData.sopNotes,
        ownerUserId: userId,
      },
    });

    await logAudit({
      userId,
      entity: "Partner",
      entityId: partner.partnerId,
      action: "CREATE",
      details: { name: partner.name },
    });

    // Fire-and-forget notification
    createNotificationForAllUsers({
      type: "PARTNER_CREATED",
      title: "New Partner Created",
      message: `Partner "${partner.name}" was created${partner.isDirect ? " (direct — check SOP compliance)" : ""}`,
      entityType: "Partner",
      entityId: partner.partnerId,
    }).catch(() => {});

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("Partner create error:", error);
    return NextResponse.json(
      { error: "Failed to create partner" },
      { status: 500 }
    );
  }
}
