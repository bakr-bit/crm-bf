import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { pageCreateSchema } from "@/lib/validations";

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
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const pageWhere: Record<string, unknown> = { assetId };
    if (!includeArchived) {
      pageWhere.status = "Active";
    }

    const pages = await prisma.page.findMany({
      where: pageWhere,
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { positions: true },
        },
      },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("Pages list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = pageCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.findUnique({
      where: { assetId },
    });

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    const data = parsed.data;

    // Check unique name per asset
    const existingPage = await prisma.page.findUnique({
      where: {
        assetId_name: {
          assetId,
          name: data.name,
        },
      },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: "A page with this name already exists for this asset" },
        { status: 409 }
      );
    }

    const page = await prisma.$transaction(async (tx) => {
      const newPage = await tx.page.create({
        data: {
          assetId,
          name: data.name,
          path: data.path,
          description: data.description,
        },
      });

      // Auto-create N/A position on the new page
      await tx.position.create({
        data: {
          pageId: newPage.pageId,
          name: "N/A",
        },
      });

      return newPage;
    });

    await logAudit({
      userId,
      entity: "Page",
      entityId: page.pageId,
      action: "CREATE",
      details: { name: page.name, assetId },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Page create error:", error);
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}
