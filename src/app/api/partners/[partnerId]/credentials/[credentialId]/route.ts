import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { credentialUpdateSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerId: string; credentialId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { partnerId, credentialId } = await params;

    const credential = await prisma.credential.findFirst({
      where: { credentialId, partnerId },
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
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Credential get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credential" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ partnerId: string; credentialId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { partnerId, credentialId } = await params;
    const body = await request.json();
    const parsed = credentialUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.credential.findFirst({
      where: { credentialId, partnerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // If label changed, check uniqueness
    if (parsed.data.label && parsed.data.label !== existing.label) {
      const dup = await prisma.credential.findUnique({
        where: {
          partnerId_label: {
            partnerId,
            label: parsed.data.label,
          },
        },
      });
      if (dup) {
        return NextResponse.json(
          { error: "A credential with this label already exists for this partner" },
          { status: 409 }
        );
      }
    }

    const credential = await prisma.credential.update({
      where: { credentialId },
      data: parsed.data,
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
    });

    await logAudit({
      userId,
      entity: "Credential",
      entityId: credentialId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data), partnerId },
    });

    return NextResponse.json(credential);
  } catch (error) {
    console.error("Credential update error:", error);
    return NextResponse.json(
      { error: "Failed to update credential" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ partnerId: string; credentialId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { partnerId, credentialId } = await params;

    const existing = await prisma.credential.findFirst({
      where: { credentialId, partnerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    await prisma.credential.delete({
      where: { credentialId },
    });

    await logAudit({
      userId,
      entity: "Credential",
      entityId: credentialId,
      action: "DELETE",
      details: { label: existing.label, partnerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Credential delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}
