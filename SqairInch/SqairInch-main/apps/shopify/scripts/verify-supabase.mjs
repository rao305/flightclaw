#!/usr/bin/env node
/**
 * Verify Supabase connection: loads .env.local and runs a simple query.
 * Run from apps/shopify: node scripts/verify-supabase.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnv() {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("FAIL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

// Try brands first; if missing, connection still works
const { data, error } = await supabase.from("brands").select("id, shop_domain").limit(3);

if (error) {
  if (error.message.includes("Could not find the table")) {
    console.log("OK: Supabase connected (URL + service_role key valid).");
    console.log("  SUPABASE_URL:", url);
    console.log("  Table 'brands' not found — run migrations: SUPABASE_DB_PASSWORD=... ./scripts/supabase-push.sh");
    process.exit(0);
  }
  console.error("FAIL: Supabase query error:", error.message);
  process.exit(1);
}

console.log("OK: Supabase connected.");
console.log("  SUPABASE_URL:", url);
console.log("  Table 'brands' query succeeded. Rows:", data?.length ?? 0);
if (data?.length) console.log("  Sample:", data);
