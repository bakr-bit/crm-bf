import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { partnerUpdateSchema } from "@/lib/validations";
import { findDuplicatePartners } from "@/lib/dedup";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { partnerId } = await params;

    const partner = await prisma.partner.findUnique({
      where: { partnerId },
      include: {
        brands: true,
        contacts: true,
        deals: {
          include: {
            brand: true,
            asset: true,
            position: true,
          },
        },
        credentials: {
          select: {
            credentialId: true,
            partnerId: true,
            label: true,
            loginUrl: true,
            username: true,
            softwareType: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(partner);
  } catch (error) {
    console.error("Partner get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { partnerId } = await params;
    const body = await request.json();
    const parsed = partnerUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.partner.findUnique({
      where: { partnerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    // Dedup check if name or domain changed (skip if force flag)
    const { force, ...updateData } = parsed.data;
    const nameChanged = updateData.name && updateData.name !== existing.name;
    const domainChanged =
      updateData.websiteDomain !== undefined &&
      updateData.websiteDomain !== existing.websiteDomain;

    if (!force && (nameChanged || domainChanged)) {
      const duplicates = await findDuplicatePartners({
        name: updateData.name ?? existing.name,
        websiteDomain: updateData.websiteDomain ?? existing.websiteDomain,
        excludePartnerId: partnerId,
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

    const partner = await prisma.partner.update({
      where: { partnerId },
      data: updateData,
    });

    await logAudit({
      userId,
      entity: "Partner",
      entityId: partnerId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("Partner update error:", error);
    return NextResponse.json(
      { error: "Failed to update partner" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { partnerId } = await params;

    const existing = await prisma.partner.findUnique({
      where: { partnerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partner = await prisma.partner.update({
      where: { partnerId },
      data: { status: "Archived" },
    });

    await logAudit({
      userId,
      entity: "Partner",
      entityId: partnerId,
      action: "ARCHIVE",
      details: { previousStatus: existing.status },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("Partner archive error:", error);
    return NextResponse.json(
      { error: "Failed to archive partner" },
      { status: 500 }
    );
  }
}
