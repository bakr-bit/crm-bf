import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SOP_BUCKET = "sop-documents";

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

export function getSupabaseClient(): SupabaseClient {
  if (globalForSupabase.supabase) {
    return globalForSupabase.supabase;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env is missing: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
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
