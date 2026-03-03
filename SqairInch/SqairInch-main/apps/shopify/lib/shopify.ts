import "@shopify/shopify-api/adapters/node";
import crypto from "node:crypto";
import { ApiVersion, type Shopify, shopifyApi } from "@shopify/shopify-api";

// biome-ignore lint/suspicious/noExplicitAny: Shopify API session/custom data has no public type
let _shopify: Shopify<any> | undefined;

// biome-ignore lint/suspicious/noExplicitAny: Shopify API session/custom data has no public type
export function getShopify(): Shopify<any> {
  if (_shopify) return _shopify;

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const appUrl = process.env.APP_URL;

  if (!apiKey) throw new Error("Missing SHOPIFY_API_KEY");
  if (!apiSecret) throw new Error("Missing SHOPIFY_API_SECRET");
  if (!appUrl) throw new Error("Missing APP_URL");

  _shopify = shopifyApi({
    apiKey,
    apiSecretKey: apiSecret,
    scopes: (process.env.SHOPIFY_SCOPES ?? "read_products,write_products").split(","),
    hostName: new URL(appUrl).hostname,
    apiVersion: ApiVersion.July24,
    isEmbeddedApp: true,
  });

  return _shopify;
}

/**
 * Verifies App Proxy HMAC signature from Shopify.
 * https://shopify.dev/docs/apps/online-store/app-proxies#calculate-a-digital-signature
 */
export function verifyAppProxyHmac(query: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const hmacParam = query.get("signature");
  if (!hmacParam) return false;

  // Build sorted key=value pairs, excluding 'signature'
  const pairs: string[] = [];
  for (const [key, value] of query.entries()) {
    if (key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const digestBuf = Buffer.from(digest);
  const hmacBuf = Buffer.from(hmacParam);
  if (digestBuf.length !== hmacBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, hmacBuf);
}
