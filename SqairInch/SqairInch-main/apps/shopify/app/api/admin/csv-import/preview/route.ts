import { parseCsvText, validateCsvRows } from "@/lib/csv-validator";
import { sessionStorage } from "@/lib/session-storage";
import { getSupabase } from "@/lib/supabase";
import { normalizeVariantId } from "@/lib/variants";
import { type NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

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

  // Size guard
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File too large (max 5 MB)" }, { status: 413 });
  }

  // Extract CSV text
  let csvText: string | null = null;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Missing file field" }, { status: 400 });
    }
    const fileObj = file as File;
    if (fileObj.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 5 MB)" }, { status: 413 });
    }
    csvText = await fileObj.text();
  } else {
    csvText = await req.text();
  }

  if (!csvText || csvText.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Empty or missing CSV body" }, { status: 400 });
  }

  const { rows } = parseCsvText(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "CSV has no data rows" }, { status: 400 });
  }

  const { valid, errors } = validateCsvRows(rows);

  // Normalize variant IDs on valid rows
  const normalizedValid = valid.map((r) => ({
    ...r,
    shopify_variant_id: normalizeVariantId(r.shopify_variant_id),
  }));

  // Insert preview job
  const supabase = getSupabase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: job, error: insertErr } = await supabase
    .from("csv_import_jobs")
    .insert({
      shop_domain: shop,
      expires_at: expiresAt,
      total_rows: rows.length,
      valid_count: normalizedValid.length,
      error_count: errors.length,
      valid_rows: normalizedValid,
      error_rows: errors,
    })
    .select("id, expires_at")
    .single();

  if (insertErr || !job) {
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? "Failed to create import job" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    job_id: job.id,
    expires_at: job.expires_at,
    summary: {
      total: rows.length,
      rows_ok: normalizedValid.length,
      rows_failed: errors.length,
    },
    ...(errors.length > 0 ? { error_details: errors } : {}),
  });
}
