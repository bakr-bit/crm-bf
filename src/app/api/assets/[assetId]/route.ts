import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { assetUpdateSchema } from "@/lib/validations";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { assetId } = await params;

    const asset = await prisma.asset.findUnique({
      where: { assetId },
      include: {
        pages: {
          where: { status: "Active" },
          orderBy: { createdAt: "asc" },
          include: {
            positions: {
              where: { status: "Active" },
              include: {
                deals: {
                  where: { status: { in: OCCUPYING_STATUSES } },
                  include: {
                    partner: true,
                    brand: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Asset get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId } = await params;
    const body = await request.json();
    const parsed = assetUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.asset.findUnique({
      where: { assetId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // Check for duplicate domain if domain is being changed
    if (
      parsed.data.assetDomain &&
      parsed.data.assetDomain !== existing.assetDomain
    ) {
      const duplicate = await prisma.asset.findUnique({
        where: { assetDomain: parsed.data.assetDomain },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: "An asset with this domain already exists",
            existingAsset: { assetId: duplicate.assetId, name: duplicate.name },
          },
          { status: 409 }
        );
      }
    }

    const asset = await prisma.asset.update({
      where: { assetId },
      data: parsed.data,
    });

    await logAudit({
      userId,
      entity: "Asset",
      entityId: assetId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data) },
    });

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Asset update error:", error);
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId } = await params;

    const existing = await prisma.asset.findUnique({
      where: { assetId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    const activeDeals = await prisma.deal.count({
      where: {
        assetId,
        status: { in: OCCUPYING_STATUSES },
      },
    });

    if (activeDeals > 0) {
      return NextResponse.json(
        { error: "Cannot delete asset with active deals. End or replace all active deals first.", activeDeals },
        { status: 409 }
      );
    }

    // Delete inactive deals referencing this asset so the asset can be deleted
    await prisma.deal.deleteMany({
      where: { assetId },
    });

    await prisma.asset.delete({
      where: { assetId },
    });

    await logAudit({
      userId,
      entity: "Asset",
      entityId: assetId,
      action: "DELETE",
      details: { name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Asset delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
