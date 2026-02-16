import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { contactUpdateSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ partnerId: string; contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { partnerId, contactId } = await params;

    const contact = await prisma.contact.findFirst({
      where: { contactId, partnerId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Contact get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ partnerId: string; contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { partnerId, contactId } = await params;
    const body = await request.json();
    const parsed = contactUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.contact.findFirst({
      where: { contactId, partnerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // If email changed, check uniqueness
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const dup = await prisma.contact.findFirst({
        where: { partnerId, email: parsed.data.email, contactId: { not: contactId } },
      });
      if (dup) {
        return NextResponse.json(
          { error: "A contact with this email already exists for this partner" },
          { status: 409 }
        );
      }
    }

    const contact = await prisma.contact.update({
      where: { contactId },
      data: parsed.data,
    });

    await logAudit({
      userId,
      entity: "Contact",
      entityId: contactId,
      action: "UPDATE",
      details: { updatedFields: Object.keys(parsed.data), partnerId },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Contact update error:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ partnerId: string; contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const { partnerId, contactId } = await params;

    const existing = await prisma.contact.findFirst({
      where: { contactId, partnerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    await prisma.contact.delete({
      where: { contactId },
    });

    await logAudit({
      userId,
      entity: "Contact",
      entityId: contactId,
      action: "DELETE",
      details: { name: existing.name, email: existing.email, partnerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
