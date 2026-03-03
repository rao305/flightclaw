export async function fetchJsonWithRetry<T>(
  url: string,
  init?: RequestInit,
  retries = 2,
  baseDelayMs = 400
): Promise<T> {
  let lastErr: unknown;

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (i === retries) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Unknown request failure");
}
