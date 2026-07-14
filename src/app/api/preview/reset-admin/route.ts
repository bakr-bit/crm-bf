import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL_ENV !== "preview") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null) as
      | { token?: string; email?: string; password?: string }
      | null;

    const token = body?.token?.trim();
    const expected = process.env.PREVIEW_ADMIN_RESET_TOKEN?.trim();

    if (!token || !expected || token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = (body?.email || "admin@bakersfield.com").trim().toLowerCase();
    const password = body?.password?.trim();

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 chars" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        isAdmin: true,
      },
      create: {
        email,
        passwordHash,
        name: "Admin User",
        isAdmin: true,
      },
    });

    return NextResponse.json({ ok: true, email });
  } catch {
    return NextResponse.json({ error: "Failed to reset admin password" }, { status: 500 });
  }
}
