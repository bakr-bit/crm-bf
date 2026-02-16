import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { pageUpdateSchema } from "@/lib/validations";
import { OCCUPYING_STATUSES } from "@/lib/deal-status";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string; pageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { assetId, pageId } = await params;

    const page = await prisma.page.findFirst({
      where: { pageId, assetId },
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
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Page get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ assetId: string; pageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId, pageId } = await params;
    const body = await request.json();
    const parsed = pageUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.page.findFirst({
      where: { pageId, assetId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // If name is being changed, check uniqueness within the asset
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.page.findUnique({
        where: {
          assetId_name: {
            assetId,
            name: parsed.data.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "A page with this name already exists for this asset" },
          { status: 409 }
        );
      }
    }

    const page = await prisma.page.update({
      where: { pageId },
      data: parsed.data,
    });

    await logAudit({
      userId,
      entity: "Page",
      entityId: pageId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data), assetId },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Page update error:", error);
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assetId: string; pageId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { assetId, pageId } = await params;

    const existing = await prisma.page.findFirst({
      where: { pageId, assetId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // Block if positions have active deals
    const activeDeals = await prisma.deal.count({
      where: {
        pageId,
        status: { in: OCCUPYING_STATUSES },
      },
    });

    if (activeDeals > 0) {
      return NextResponse.json(
        { error: "Cannot archive page with active deals", activeDeals },
        { status: 409 }
      );
    }

    const page = await prisma.page.update({
      where: { pageId },
      data: { status: "Archived" },
    });

    await logAudit({
      userId,
      entity: "Page",
      entityId: pageId,
      action: "ARCHIVE",
      details: { name: existing.name, assetId, previousStatus: existing.status },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("Page delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
