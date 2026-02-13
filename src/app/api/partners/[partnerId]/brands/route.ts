import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { brandCreateSchema } from "@/lib/validations";

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
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const brands = await prisma.brand.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error("Partner brands list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const parsed = brandCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const partner = await prisma.partner.findUnique({
      where: { partnerId },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const data = parsed.data;

    const brand = await prisma.brand.create({
      data: {
        partnerId,
        name: data.name,
        brandDomain: data.brandDomain,
        trackingDomain: data.trackingDomain,
        brandIdentifiers: data.brandIdentifiers ?? undefined,
        postbacks: data.postbacks,
        licenseInfo: data.licenseInfo,
        extraInfo: data.extraInfo,
        affiliateSoftware: data.affiliateSoftware,
        status: data.status,
        targetGeos: data.targetGeos,
      },
    });

    await logAudit({
      userId,
      entity: "Brand",
      entityId: brand.brandId,
      action: "CREATE",
      details: { name: brand.name, partnerId },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Brand create error:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
