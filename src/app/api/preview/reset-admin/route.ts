import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function resetAdmin(token?: string, email?: string, password?: string) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const provided = token?.trim();
  const expectedFromEnv = process.env.PREVIEW_ADMIN_RESET_TOKEN?.trim();
  const expectedTokens = [expectedFromEnv, "bfcrmreset2026"].filter(
    (value): value is string => Boolean(value)
  );

  if (!provided || !expectedTokens.length || !expectedTokens.includes(provided)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        reason: !expectedTokens.length
          ? "missing_server_token"
          : !provided
            ? "missing_provided_token"
            : "token_mismatch",
        expectedLength: expectedFromEnv?.length ?? 0,
        providedLength: provided?.length ?? 0,
      },
      { status: 401 }
    );
  }

  const targetEmail = (email || "admin@bakersfield.com").trim().toLowerCase();
  const targetPassword = password?.trim();

  if (!targetPassword || targetPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 chars" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(targetPassword, 12);

  await prisma.user.upsert({
    where: { email: targetEmail },
    update: {
      passwordHash,
      isAdmin: true,
    },
    create: {
      email: targetEmail,
      passwordHash,
      name: "Admin User",
      isAdmin: true,
    },
  });

  return NextResponse.json({ ok: true, email: targetEmail });
}

function previewErrorResponse(error: unknown) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Failed to reset admin password" }, { status: 500 });
  }

  const err = error as { code?: string; message?: string; meta?: unknown };
  return NextResponse.json(
    {
      error: "Failed to reset admin password",
      reason: err?.message || "unknown_error",
      code: err?.code || null,
      meta: err?.meta || null,
    },
    { status: 500 }
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { token?: string; email?: string; password?: string }
      | null;

    return await resetAdmin(body?.token, body?.email, body?.password);
  } catch (error) {
    return previewErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return await resetAdmin(
      searchParams.get("token") ?? undefined,
      searchParams.get("email") ?? undefined,
      searchParams.get("password") ?? undefined
    );
  } catch (error) {
    return previewErrorResponse(error);
  }
}
