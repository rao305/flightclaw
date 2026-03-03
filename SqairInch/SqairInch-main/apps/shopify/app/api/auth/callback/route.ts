import { sessionStorage } from "@/lib/session-storage";
import { getShopify } from "@/lib/shopify";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, headers } = await getShopify().auth.callback({
    rawRequest: req,
    rawResponse: new NextResponse(),
  });

  // Persist session
  sessionStorage.storeSession(session);

  // Redirect to embedded admin entry point
  const shop = session.shop;
  const host =
    req.nextUrl.searchParams.get("host") ?? Buffer.from(`${shop}/admin`).toString("base64url");

  const response = NextResponse.redirect(
    new URL(`/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`, req.url)
  );

  // Forward any cookies (e.g. session cookie) set by shopify-api
  const setCookie = headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
