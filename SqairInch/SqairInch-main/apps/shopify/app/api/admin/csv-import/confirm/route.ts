import { sessionStorage } from "@/lib/session-storage";
import { getSupabase } from "@/lib/supabase";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop")?.trim();
  if (!shop) {
    return NextResponse.json({ ok: false, error: "Missing shop query parameter" }, { status: 400 });
  }

  // Auth
  const sessions = sessionStorage.findSessionsByShop(shop);
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let jobId: string | undefined;
  try {
    const body = await req.json();
    jobId = body?.job_id;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing job_id" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Pre-flight check
  const { data: job, error: lookupErr } = await supabase
    .from("csv_import_jobs")
    .select("id, status, expires_at, valid_count")
    .eq("id", jobId)
    .eq("shop_domain", shop)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ ok: false, error: lookupErr.message }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "Job already applied / expired" },
      { status: 409 }
    );
  }
  if (new Date(job.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: "Job has expired" }, { status: 409 });
  }
  if (job.valid_count === 0) {
    return NextResponse.json({ ok: false, error: "No valid rows to apply" }, { status: 400 });
  }

  // Call transactional RPC
  const { data: rpcResult, error: rpcErr } = await supabase.rpc("bulk_upsert_csv_import", {
    p_job_id: jobId,
    p_shop_domain: shop,
  });

  if (rpcErr) {
    return NextResponse.json({ ok: false, error: rpcErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    job_id: jobId,
    applied: (rpcResult as { applied: number })?.applied ?? job.valid_count,
  });
}
