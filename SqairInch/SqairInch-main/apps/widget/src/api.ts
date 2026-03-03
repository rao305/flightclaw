import {
  type EventPayload,
  type SkuResponse,
  SkuResponseSchema,
  type WidgetConfig,
  WidgetConfigSchema,
} from "@sqairinch/shared";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function validateBaseUrl(baseUrl: string): void {
  if (!/^https:\/\//.test(baseUrl)) {
    throw new ApiError("INVALID_URL", 0, "baseUrl must use HTTPS");
  }
}

function mapHttpError(status: number): ApiError {
  if (status === 404) return new ApiError("SKU_NOT_FOUND", 404, "No measurements for this item");
  if (status === 401) return new ApiError("UNAUTHORIZED", 401, "Configuration error");
  if (status === 429) return new ApiError("RATE_LIMITED", 429, "Too many requests");
  if (status >= 500) return new ApiError("SERVER_ERROR", status, "Server error");
  return new ApiError("HTTP_ERROR", status, `HTTP error ${status}`);
}

/**
 * Fetch with one automatic retry on 5xx or network errors.
 * 4xx errors are returned immediately without retry.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let shouldRetry = false;

  try {
    const res = await fetch(url);
    if (res.status < 500) return res; // 2xx or 4xx — no retry needed
    shouldRetry = true;
  } catch {
    shouldRetry = true; // network error
  }

  if (!shouldRetry) {
    // Unreachable but satisfies TS
    throw new ApiError("NETWORK_ERROR", 0, "Network unavailable");
  }

  await new Promise<void>((r) => setTimeout(r, 1000));

  try {
    const res = await fetch(url);
    if (res.status >= 500) {
      throw new ApiError("SERVER_ERROR", res.status, "Server error");
    }
    return res;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("NETWORK_ERROR", 0, "Network unavailable");
  }
}

export async function fetchConfig(baseUrl: string, qs: string): Promise<WidgetConfig> {
  validateBaseUrl(baseUrl);
  const url = `${baseUrl}/apps/sqairinch/config?${qs}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw mapHttpError(res.status);
  const json: unknown = await res.json();
  const parsed = WidgetConfigSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError("MALFORMED_RESPONSE", 200, "Unexpected response shape");
  }
  return parsed.data;
}

export async function fetchSku(
  baseUrl: string,
  qs: string,
  variantId: string
): Promise<SkuResponse> {
  validateBaseUrl(baseUrl);
  const url = `${baseUrl}/apps/sqairinch/sku?variant=${encodeURIComponent(variantId)}&${qs}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw mapHttpError(res.status);
  const json: unknown = await res.json();
  const parsed = SkuResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError("MALFORMED_RESPONSE", 200, "Unexpected response shape");
  }
  return parsed.data;
}

export async function logEvent(
  baseUrl: string,
  qs: string,
  payload: EventPayload,
  debug = false
): Promise<void> {
  try {
    if (!/^https:\/\//.test(baseUrl)) return;
    const url = `${baseUrl}/apps/sqairinch/event?${qs}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (debug) {
      console.warn("[Sqairinch] logEvent failed:", err);
    }
  }
}
