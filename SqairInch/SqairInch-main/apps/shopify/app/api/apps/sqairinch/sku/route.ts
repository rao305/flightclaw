import { verifyAppProxyHmac } from "@/lib/shopify";
import { getSupabase } from "@/lib/supabase";
import { normalizeVariantId } from "@/lib/variants";
import { SkuResponseSchema } from "@sqairinch/shared";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams;

  if (!verifyAppProxyHmac(query)) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const variantParam = query.get("variant")?.trim();
  if (!variantParam) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Missing variant param." } },
      { status: 400 }
    );
  }

  const shop = query.get("shop")?.trim();
  if (!shop) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Missing shop param." } },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    const normalizedId = normalizeVariantId(variantParam);

    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("shop_domain", shop)
      .maybeSingle();

    if (!brand) {
      return NextResponse.json(
        {
          error: {
            code: "SKU_NOT_FOUND",
            message: "No garment measurements found for this variant.",
            variantId: variantParam,
          },
        },
        { status: 404 }
      );
    }

    const { data: variantRow, error: variantError } = await supabase
      .from("variants")
      .select(
        `
        id,
        shopify_variant_id,
        size_label,
        variant_measurements(measurements_cm, fabric_type, category, updated_at),
        variant_assets(image_url)
      `
      )
      .eq("brand_id", brand.id)
      .eq("shopify_variant_id", normalizedId)
      .maybeSingle();

    if (variantError) {
      console.error("[sku] DB error:", variantError);
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "An error occurred." } },
        { status: 500 }
      );
    }

    if (!variantRow) {
      return NextResponse.json(
        {
          error: {
            code: "SKU_NOT_FOUND",
            message: "No garment measurements found for this variant.",
            variantId: variantParam,
          },
        },
        { status: 404 }
      );
    }

    const measurements = Array.isArray(variantRow.variant_measurements)
      ? variantRow.variant_measurements[0]
      : variantRow.variant_measurements;
    if (!measurements) {
      return NextResponse.json(
        {
          error: {
            code: "SKU_NOT_FOUND",
            message: "No garment measurements found for this variant.",
            variantId: variantParam,
          },
        },
        { status: 404 }
      );
    }

    const assets = Array.isArray(variantRow.variant_assets) ? variantRow.variant_assets : [];
    const firstAsset = assets[0] as { image_url: string } | undefined;
    const imageUrl = firstAsset?.image_url;

    const measurementsCm =
      typeof measurements.measurements_cm === "object" && measurements.measurements_cm !== null
        ? (measurements.measurements_cm as Record<string, number>)
        : {};

    const updatedAt =
      measurements.updated_at instanceof Date
        ? measurements.updated_at.toISOString()
        : new Date(measurements.updated_at as string).toISOString();

    const payload = {
      variantId: variantParam,
      sizeLabel: variantRow.size_label,
      category: measurements.category,
      fabricType: measurements.fabric_type,
      unit: "cm" as const,
      ...(imageUrl && { imageUrl }),
      measurementsCm,
      updatedAt,
    };

    const parsed = SkuResponseSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("[sku] Response validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "An error occurred." } },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed.data, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    console.error("[sku] Unexpected error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An error occurred." } },
      { status: 500 }
    );
  }
}
