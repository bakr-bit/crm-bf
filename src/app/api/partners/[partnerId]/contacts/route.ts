import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { contactCreateSchema } from "@/lib/validations";

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

    const contacts = await prisma.contact.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Partner contacts list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
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
    const parsed = contactCreateSchema.safeParse(body);

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

    // Check unique email per partner (only if email provided)
    if (data.email) {
      const existingContact = await prisma.contact.findFirst({
        where: { partnerId, email: data.email },
      });

      if (existingContact) {
        return NextResponse.json(
          { error: "A contact with this email already exists for this partner" },
          { status: 409 }
        );
      }
    }

    const contact = await prisma.contact.create({
      data: {
        partnerId,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        role: data.role,
        telegram: data.telegram,
        whatsapp: data.whatsapp,
        preferredContact: data.preferredContact,
        geo: data.geo,
      },
    });

    await logAudit({
      userId,
      entity: "Contact",
      entityId: contact.contactId,
      action: "CREATE",
      details: { name: contact.name, email: contact.email, partnerId },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Contact create error:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
