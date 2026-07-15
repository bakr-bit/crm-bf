import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SOP_BUCKET = "sop-documents";

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

function normalizeSupabaseUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^postgres(ql)?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();

      // Typical direct host: db.<project-ref>.supabase.co
      const dbHostMatch = host.match(/^db\.([a-z0-9]{20})\.supabase\.co$/i);
      if (dbHostMatch?.[1]) {
        return `https://${dbHostMatch[1]}.supabase.co`;
      }

      // Fallback: any host containing '<project-ref>.supabase.co'
      const coMatch = host.match(/([a-z0-9]{20})\.supabase\.co$/i);
      if (coMatch?.[1]) {
        return `https://${coMatch[1]}.supabase.co`;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function getSupabaseClient(): SupabaseClient {
  if (globalForSupabase.supabase) {
    return globalForSupabase.supabase;
  }

  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase env is missing/invalid: NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  if (process.env.NODE_ENV !== "production") {
    globalForSupabase.supabase = client;
  }

  return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    return Reflect.get(client as object, prop, receiver);
  },
});
