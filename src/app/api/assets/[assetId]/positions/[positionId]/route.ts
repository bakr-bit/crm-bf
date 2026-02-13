import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { positionUpdateSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string; positionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { assetId, positionId } = await params;

    const position = await prisma.position.findFirst({
      where: {
        positionId,
        assetId,
      },
      include: {
        asset: true,
        deals: {
          where: { status: "Active" },
          include: {
            partner: true,
            brand: true,
          },
        },
      },
    });

    if (!position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error("Position get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch position" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ assetId: string; positionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId, positionId } = await params;
    const body = await request.json();
    const parsed = positionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.position.findFirst({
      where: {
        positionId,
        assetId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    // If name is being changed, check uniqueness within the asset
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.position.findUnique({
        where: {
          assetId_name: {
            assetId,
            name: parsed.data.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A position with this name already exists for this asset" },
          { status: 409 }
        );
      }
    }

    const position = await prisma.position.update({
      where: { positionId },
      data: parsed.data,
    });

    await logAudit({
      userId,
      entity: "Position",
      entityId: positionId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data), assetId },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error("Position update error:", error);
    return NextResponse.json(
      { error: "Failed to update position" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assetId: string; positionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId, positionId } = await params;

    const existing = await prisma.position.findFirst({
      where: {
        positionId,
        assetId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    const activeDeal = await prisma.deal.findFirst({
      where: {
        positionId,
        status: "Active",
      },
    });

    if (activeDeal) {
      return NextResponse.json(
        {
          error: "Cannot archive position with an active deal",
          activeDealId: activeDeal.dealId,
        },
        { status: 409 }
      );
    }

    const position = await prisma.position.update({
      where: { positionId },
      data: { status: "Archived" },
    });

    await logAudit({
      userId,
      entity: "Position",
      entityId: positionId,
      action: "ARCHIVE",
      details: { name: existing.name, assetId, previousStatus: existing.status },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error("Position delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete position" },
      { status: 500 }
    );
  }
}
