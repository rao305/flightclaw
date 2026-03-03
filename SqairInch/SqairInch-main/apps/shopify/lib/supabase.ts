import { type SupabaseClient, createClient } from "@supabase/supabase-js";

let _client: SupabaseClient | undefined;

/**
 * Server-only Supabase client (uses SERVICE_ROLE_KEY).
 * Throws if env is missing — fail fast when proxy/API is hit.
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  _client = createClient(url, key);
  return _client;
}
