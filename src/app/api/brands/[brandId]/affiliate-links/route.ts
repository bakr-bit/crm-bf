import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { affiliateLinkCreateSchema } from "@/lib/validations";

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
    });

    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const affiliateLinks = await prisma.affiliateLink.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(affiliateLinks);
  } catch (error) {
    console.error("Affiliate links list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliate links" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = affiliateLinkCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findUnique({
      where: { brandId },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const data = parsed.data;

    // Check unique label per brand
    const existing = await prisma.affiliateLink.findUnique({
      where: {
        brandId_label: {
          brandId,
          label: data.label,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An affiliate link with this label already exists for this brand" },
        { status: 409 }
      );
    }

    const affiliateLink = await prisma.affiliateLink.create({
      data: {
        brandId,
        label: data.label,
        url: data.url,
        geo: data.geo,
      },
    });

    await logAudit({
      userId,
      entity: "AffiliateLink",
      entityId: affiliateLink.affiliateLinkId,
      action: "CREATE",
      details: { label: affiliateLink.label, brandId },
    });

    return NextResponse.json(affiliateLink, { status: 201 });
  } catch (error) {
    console.error("Affiliate link create error:", error);
    return NextResponse.json(
      { error: "Failed to create affiliate link" },
      { status: 500 }
    );
  }
}
