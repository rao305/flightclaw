import { skuResponseTopFixture, widgetConfigFixture } from "@sqairinch/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchConfig, fetchSku, logEvent } from "../api.js";

const BASE_URL = "https://example.myshopify.com";
const QS = "shop=example.myshopify.com&timestamp=123&hmac=abc";

function makeFetchResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchConfig", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns parsed config on success", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(200, widgetConfigFixture));
    const config = await fetchConfig(BASE_URL, QS);
    expect(config.version).toBe(widgetConfigFixture.version);
    expect(config.enabledZones).toEqual(widgetConfigFixture.enabledZones);
  });

  it("throws INVALID_URL for non-https baseUrl", async () => {
    global.fetch = vi.fn();
    await expect(fetchConfig("http://example.com", QS)).rejects.toMatchObject({
      code: "INVALID_URL",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws SKU_NOT_FOUND on 404", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(404, { error: "not found" }));
    await expect(fetchConfig(BASE_URL, QS)).rejects.toMatchObject({
      code: "SKU_NOT_FOUND",
      status: 404,
    });
  });

  it("retries once on 5xx then throws SERVER_ERROR", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(503, { error: "unavailable" }))
      .mockResolvedValueOnce(makeFetchResponse(503, { error: "unavailable" }));

    const promise = fetchConfig(BASE_URL, QS);
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection warning
    const assertion = expect(promise).rejects.toMatchObject({ code: "SERVER_ERROR", status: 503 });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries once on network throw then throws NETWORK_ERROR", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockRejectedValueOnce(new TypeError("Network error"));

    const promise = fetchConfig(BASE_URL, QS);
    const assertion = expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws MALFORMED_RESPONSE when response shape is invalid", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(200, { unexpected: "shape" }));
    await expect(fetchConfig(BASE_URL, QS)).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
      status: 200,
    });
  });

  it("succeeds on second attempt after first 5xx", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(makeFetchResponse(500, { error: "server error" }))
      .mockResolvedValueOnce(makeFetchResponse(200, widgetConfigFixture));

    const promise = fetchConfig(BASE_URL, QS);
    await vi.runAllTimersAsync();
    const config = await promise;
    expect(config.version).toBe(widgetConfigFixture.version);
  });
});

describe("fetchSku", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns parsed SKU on success", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(200, skuResponseTopFixture));
    const sku = await fetchSku(BASE_URL, QS, "variant-123");
    expect(sku.variantId).toBe(skuResponseTopFixture.variantId);
  });

  it("throws SKU_NOT_FOUND on 404", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(404, { error: "not found" }));
    await expect(fetchSku(BASE_URL, QS, "variant-404")).rejects.toMatchObject({
      code: "SKU_NOT_FOUND",
      status: 404,
    });
  });

  it("throws UNAUTHORIZED on 401", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(401, { error: "unauthorized" }));
    await expect(fetchSku(BASE_URL, QS, "variant-401")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("throws RATE_LIMITED on 429", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(429, { error: "rate limited" }));
    await expect(fetchSku(BASE_URL, QS, "variant-429")).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("retries once on network error then throws NETWORK_ERROR", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("failed to fetch"))
      .mockRejectedValueOnce(new TypeError("failed to fetch"));

    const promise = fetchSku(BASE_URL, QS, "variant-net");
    const assertion = expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws MALFORMED_RESPONSE on bad JSON shape", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(200, { bad: "data" }));
    await expect(fetchSku(BASE_URL, QS, "variant-bad")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });
});

describe("logEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("swallows fetch errors silently", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("network down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      logEvent(BASE_URL, QS, {
        type: "error",
        sessionId: "session-1",
        timestamp: new Date().toISOString(),
        payload: { code: "TEST", message: "test" },
      })
    ).resolves.toBeUndefined();

    // Should not throw
    expect(warnSpy).not.toHaveBeenCalled(); // debug=false (default)
  });

  it("does not throw on invalid baseUrl", async () => {
    global.fetch = vi.fn();
    await expect(
      logEvent("http://insecure.com", QS, {
        type: "error",
        sessionId: "session-1",
        timestamp: new Date().toISOString(),
        payload: {},
      })
    ).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is an instance of ApiError when fetchConfig throws", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeFetchResponse(404, {}));
    try {
      await fetchConfig(BASE_URL, QS);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });
});
