import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SOP_BUCKET = "sop-documents";

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

function getSupabaseClient(): SupabaseClient {
  if (globalForSupabase.supabase) return globalForSupabase.supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const client = createClient(url, key);
  globalForSupabase.supabase = client;
  return client;
}

// Lazy proxy: the underlying client is only created on first property access
// (e.g. `supabase.storage`), not at module import. This keeps `next build`
// page-data collection — which merely evaluates route modules — from
// instantiating the client and throwing when the Supabase env vars are absent
// in that environment (e.g. preview deployments without the vars set).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
