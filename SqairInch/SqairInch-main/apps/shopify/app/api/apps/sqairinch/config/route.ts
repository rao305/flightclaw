import { verifyAppProxyHmac } from "@/lib/shopify";
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig, WidgetConfigSchema } from "@sqairinch/shared";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Resolve config for a given shop domain.
 * Returns the global default; stub for per-shop overrides.
 * TODO(TSQA-025): fetch per-shop overrides from brand_configs table and merge.
 */
function resolveConfig(_shop: string | null): WidgetConfig {
  return DEFAULT_WIDGET_CONFIG;
}

export function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams;

    if (!verifyAppProxyHmac(query)) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const shop = query.get("shop")?.trim() ?? null;
    const config = resolveConfig(shop);

    // Runtime validation ensures the shape sent to widgets is always schema-correct.
    const parsed = WidgetConfigSchema.safeParse(config);
    if (!parsed.success) {
      console.error("[config] Response validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "Internal server error" } },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed.data, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
