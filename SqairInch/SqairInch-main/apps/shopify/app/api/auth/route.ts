import { getShopify } from "@/lib/shopify";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  // shopify.auth.begin() returns the redirect URL + sets a state cookie
  const { headers, redirectUrl } = await getShopify().auth.begin({
    shop,
    callbackPath: "/api/auth/callback",
    isOnline: false,
    rawRequest: req,
    rawResponse: new NextResponse(),
  });

  const response = NextResponse.redirect(redirectUrl);
  // Forward any cookies set by shopify-api (e.g. state)
  const setCookie = headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }
  return response;
}
