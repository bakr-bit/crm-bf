import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { credentialCreateSchema } from "@/lib/validations";

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

    const credentials = await prisma.credential.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      select: {
        credentialId: true,
        partnerId: true,
        label: true,
        loginUrl: true,
        username: true,
        email: true,
        password: true,
        softwareType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(credentials);
  } catch (error) {
    console.error("Credentials list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
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
    const parsed = credentialCreateSchema.safeParse(body);

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

    // Check unique label per partner
    const existing = await prisma.credential.findUnique({
      where: {
        partnerId_label: {
          partnerId,
          label: data.label,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A credential with this label already exists for this partner" },
        { status: 409 }
      );
    }

    const credential = await prisma.credential.create({
      data: {
        partnerId,
        label: data.label,
        loginUrl: data.loginUrl,
        username: data.username,
        email: data.email || null,
        password: data.password,
        softwareType: data.softwareType,
        notes: data.notes,
      },
      select: {
        credentialId: true,
        partnerId: true,
        label: true,
        loginUrl: true,
        username: true,
        email: true,
        password: true,
        softwareType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId,
      entity: "Credential",
      entityId: credential.credentialId,
      action: "CREATE",
      details: { label: credential.label, partnerId },
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    console.error("Credential create error:", error);
    return NextResponse.json(
      { error: "Failed to create credential" },
      { status: 500 }
    );
  }
}
