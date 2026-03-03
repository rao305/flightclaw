import { sessionStorage } from "@/lib/session-storage";
import { getSupabase } from "@/lib/supabase";
import { type NextRequest, NextResponse } from "next/server";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop")?.trim();
  if (!shop) {
    return NextResponse.json({ ok: false, error: "Missing shop query parameter" }, { status: 400 });
  }

  // Auth
  const sessions = sessionStorage.findSessionsByShop(shop);
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const typeFilter = req.nextUrl.searchParams.get("type")?.trim() ?? null;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    limitParam ? Math.max(1, Number.parseInt(limitParam, 10) || DEFAULT_LIMIT) : DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const supabase = getSupabase();

  let query = supabase
    .from("events")
    .select("id, type, session_id, shopify_variant_id, payload, ts, created_at")
    .eq("shop_domain", shop)
    .order("ts", { ascending: false })
    .limit(limit);

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, events: events ?? [] });
}
