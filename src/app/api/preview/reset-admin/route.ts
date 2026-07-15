import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, prismaDbDiagnostics } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

function buildPreviewUserId() {
  return `c${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function supabaseEnvDiagnostics() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  let host: string | null = null;
  try {
    host = raw ? new URL(raw).hostname : null;
  } catch {
    host = null;
  }

  return {
    hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasServiceRoleKey: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE ||
        process.env.SUPABASE_SECRET_KEY
    ),
    rawLooksHttp: /^https?:\/\//i.test(raw),
    rawLooksPostgres: /^postgres(ql)?:\/\//i.test(raw),
    rawHost: host,
  };
}

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

  let resetVia: "prisma" | "supabase-fallback" = "prisma";

  try {
    await prisma.user.upsert({
      where: { email: targetEmail },
      update: {
        passwordHash,
        name: "Admin User",
        isAdmin: true,
      },
      create: {
        email: targetEmail,
        passwordHash,
        name: "Admin User",
        isAdmin: true,
      },
    });
  } catch (error) {
    const err = error as { code?: string; message?: string; meta?: unknown };
    const shouldTrySupabaseFallback =
      process.env.VERCEL_ENV === "preview" &&
      (err?.code === "P1000" || err?.code === "P1001" || err?.code === "P1017");

    if (!shouldTrySupabaseFallback) {
      throw error;
    }

    const { data: existingUser, error: readError } = await supabase
      .from("User")
      .select("id")
      .ilike("email", targetEmail)
      .limit(1)
      .maybeSingle();

    if (readError) {
      throw new Error(`supabase_read_failed:${readError.code || "unknown"}:${readError.message}`);
    }

    if (existingUser?.id) {
      const { error: updateError } = await supabase
        .from("User")
        .update({
          passwordHash,
          name: "Admin User",
          isAdmin: true,
        })
        .eq("id", existingUser.id);

      if (updateError) {
        throw new Error(`supabase_update_failed:${updateError.code || "unknown"}:${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase.from("User").insert({
        id: buildPreviewUserId(),
        email: targetEmail,
        passwordHash,
        name: "Admin User",
        isAdmin: true,
      });

      if (insertError) {
        throw new Error(`supabase_insert_failed:${insertError.code || "unknown"}:${insertError.message}`);
      }
    }

    resetVia = "supabase-fallback";
  }

  return NextResponse.json({
    ok: true,
    email: targetEmail,
    via: resetVia,
    db: process.env.VERCEL_ENV === "preview" ? prismaDbDiagnostics : undefined,
  });
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
      db: prismaDbDiagnostics,
      supabase: supabaseEnvDiagnostics(),
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
