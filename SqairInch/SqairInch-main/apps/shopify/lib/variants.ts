import type { SupabaseClient } from "@supabase/supabase-js";

const GID_PREFIX = "gid://shopify/ProductVariant/";

/** Normalize variant id: numeric string → GID format. */
export function normalizeVariantId(variant: string): string {
  const trimmed = variant.trim();
  if (/^\d+$/.test(trimmed)) return `${GID_PREFIX}${trimmed}`;
  return trimmed;
}

interface UpsertVariantInput {
  shopDomain: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  sizeLabel: string;
  measurementsCm: Record<string, number>;
  fabricType: "STRETCHY" | "MODERATE" | "STIFF";
  category: "top" | "bottom" | "full_body";
  imageUrl?: string;
}

interface UpsertVariantResult {
  variantId: string;
}

/**
 * Upsert a variant (and its product + measurements) using the canonical composite key
 * (brand_id, shopify_variant_id).
 *
 * Steps:
 *   1. Brand lookup by shop_domain — throws if not found
 *   2. Upsert product ON CONFLICT (brand_id, shopify_product_id)
 *   3. Upsert variant ON CONFLICT (brand_id, shopify_variant_id)
 *   4. Upsert variant_measurements ON CONFLICT (variant_id)
 */
export async function upsertVariant(
  supabase: SupabaseClient,
  input: UpsertVariantInput
): Promise<UpsertVariantResult> {
  const {
    shopDomain,
    shopifyProductId,
    shopifyVariantId,
    sizeLabel,
    measurementsCm,
    fabricType,
    category,
    imageUrl,
  } = input;

  // Step 1: Brand lookup
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("shop_domain", shopDomain)
    .maybeSingle();

  if (brandError) throw new Error(`Brand lookup failed: ${brandError.message}`);
  if (!brand) throw new Error(`Brand not found for shop: ${shopDomain}`);

  const brandId: string = brand.id;

  // Step 2: Upsert product
  const { data: product, error: productError } = await supabase
    .from("products")
    .upsert(
      { brand_id: brandId, shopify_product_id: shopifyProductId },
      { onConflict: "brand_id,shopify_product_id" }
    )
    .select("id")
    .single();

  if (productError) throw new Error(`Product upsert failed: ${productError.message}`);

  // Step 3: Upsert variant
  const { data: variant, error: variantError } = await supabase
    .from("variants")
    .upsert(
      {
        product_id: product.id,
        brand_id: brandId,
        shopify_variant_id: shopifyVariantId,
        size_label: sizeLabel,
      },
      { onConflict: "brand_id,shopify_variant_id" }
    )
    .select("id")
    .single();

  if (variantError) throw new Error(`Variant upsert failed: ${variantError.message}`);

  // Step 4: Upsert variant_measurements
  const { error: measError } = await supabase.from("variant_measurements").upsert(
    {
      variant_id: variant.id,
      measurements_cm: measurementsCm,
      fabric_type: fabricType,
      category,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "variant_id" }
  );

  if (measError) throw new Error(`Measurements upsert failed: ${measError.message}`);

  // Step 5: Upsert variant_assets for CSV-sourced image (optional)
  if (imageUrl) {
    const { error: delErr } = await supabase
      .from("variant_assets")
      .delete()
      .eq("variant_id", variant.id)
      .eq("source", "csv_import");
    if (delErr) throw new Error(`Asset delete failed: ${delErr.message}`);

    const { error: assetErr } = await supabase
      .from("variant_assets")
      .insert({ variant_id: variant.id, image_url: imageUrl, source: "csv_import" });
    if (assetErr) throw new Error(`Asset insert failed: ${assetErr.message}`);
  }

  return { variantId: variant.id };
}
