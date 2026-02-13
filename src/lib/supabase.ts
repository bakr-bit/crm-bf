import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SOP_BUCKET = "sop-documents";

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

export const supabase =
  globalForSupabase.supabase ??
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabase = supabase;
}
