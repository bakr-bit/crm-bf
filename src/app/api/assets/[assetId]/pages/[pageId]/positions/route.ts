import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { positionCreateSchema } from "@/lib/validations";

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
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const positionWhere: Record<string, unknown> = { pageId };
    if (!includeArchived) {
      positionWhere.status = "Active";
    }

    const positions = await prisma.position.findMany({
      where: positionWhere,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { deals: true },
        },
      },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error("Positions list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = positionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const page = await prisma.page.findFirst({
      where: { pageId, assetId },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    const data = parsed.data;

    // Check unique name per page
    const existingPosition = await prisma.position.findUnique({
      where: {
        pageId_name: {
          pageId,
          name: data.name,
        },
      },
    });

    if (existingPosition) {
      return NextResponse.json(
        { error: "A position with this name already exists for this page" },
        { status: 409 }
      );
    }

    const position = await prisma.position.create({
      data: {
        pageId,
        name: data.name,
        details: data.details,
      },
    });

    await logAudit({
      userId,
      entity: "Position",
      entityId: position.positionId,
      action: "CREATE",
      details: { name: position.name, pageId, assetId },
    });

    return NextResponse.json(position, { status: 201 });
  } catch (error) {
    console.error("Position create error:", error);
    return NextResponse.json(
      { error: "Failed to create position" },
      { status: 500 }
    );
  }
}
