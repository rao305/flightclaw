import { verifyAppProxyHmac } from "@/lib/shopify";
import { getSupabase } from "@/lib/supabase";
import { EventPayloadSchema } from "@sqairinch/shared";
import { type NextRequest, NextResponse } from "next/server";

// --- In-memory rate limiter (per shop+session, sliding 60-second window) ---
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const _rateStore = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (_rateStore.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) return true;
  hits.push(now);
  _rateStore.set(key, hits);
  return false;
}

// --- Handler ---
export async function POST(req: NextRequest) {
  const query = req.nextUrl.searchParams;

  if (!verifyAppProxyHmac(query)) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const shop = query.get("shop");
  if (!shop) {
    return NextResponse.json({ ok: false, error: { code: "MISSING_SHOP" } }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  const result = EventPayloadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", details: result.error.flatten() } },
      { status: 422 }
    );
  }

  const rateKey = `${shop}:${result.data.sessionId}`;
  if (isRateLimited(rateKey)) {
    return NextResponse.json({ ok: false, error: { code: "RATE_LIMITED" } }, { status: 429 });
  }

  const supabase = getSupabase();
  const { error: dbError } = await supabase.from("events").insert({
    type: result.data.type,
    session_id: result.data.sessionId,
    shopify_variant_id: result.data.variantId ?? null,
    payload: result.data.payload,
    ts: new Date(result.data.timestamp).toISOString(),
    shop_domain: shop,
  });

  if (dbError) {
    console.error("[event] db insert failed", dbError.message);
    return NextResponse.json({ ok: false, error: { code: "DB_ERROR" } }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
