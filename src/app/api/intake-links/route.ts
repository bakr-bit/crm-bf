import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions, isValidApiKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { intakeLinkCreateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session!.user.id;
    const body = await request.json();
    const parsed = intakeLinkCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);

    const link = await prisma.intakeLink.create({
      data: {
        tokenHash,
        createdByUserId: userId,
        expiresAt,
        note: parsed.data.note,
      },
    });

    const baseUrl = (process.env.NEXTAUTH_URL || request.headers.get("origin") || "").trim().replace(/\/+$/, "");
    const intakeUrl = `${baseUrl}/intake/${token}`;

    return NextResponse.json(
      {
        intakeLinkId: link.intakeLinkId,
        token,
        url: intakeUrl,
        expiresAt: link.expiresAt,
        note: link.note,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Intake link create error:", error);
    return NextResponse.json(
      { error: "Failed to create intake link" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session && !isValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const links = await prisma.intakeLink.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Intake links list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch intake links" },
      { status: 500 }
    );
  }
}
