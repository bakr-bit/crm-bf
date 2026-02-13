import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { brandUpdateSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { brandId } = await params;

    const brand = await prisma.brand.findUnique({
      where: { brandId },
      include: {
        partner: true,
        deals: true,
      },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Brand get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { brandId } = await params;
    const body = await request.json();
    const parsed = brandUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.brand.findUnique({
      where: { brandId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const brand = await prisma.brand.update({
      where: { brandId },
      data: parsed.data,
    });

    await logAudit({
      userId,
      entity: "Brand",
      entityId: brandId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data) },
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Brand update error:", error);
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { brandId } = await params;

    const existing = await prisma.brand.findUnique({
      where: { brandId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const brand = await prisma.brand.update({
      where: { brandId },
      data: { status: "Archived" },
    });

    await logAudit({
      userId,
      entity: "Brand",
      entityId: brandId,
      action: "ARCHIVE",
      details: { previousStatus: existing.status },
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Brand archive error:", error);
    return NextResponse.json(
      { error: "Failed to archive brand" },
      { status: 500 }
    );
  }
}
