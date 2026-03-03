import type { PriceQuote } from "../types/models.js";
import type { FlightclawResponse } from "../types/providers.js";
import { flightclawResponseSchema } from "../types/providers.js";
import { fetchJsonWithRetry } from "../utils/http.js";
import { mockNow, seededRandom, type MockOptions } from "../utils/mock.js";

export interface PriceTrackerAdapter {
  searchRoute(input: {
    origin: string;
    destination: string;
    startDate: string;
    endDate: string;
  }): Promise<PriceQuote>;
}

export class MockPriceTrackerAdapter implements PriceTrackerAdapter {
  constructor(private readonly opts: MockOptions = {}) {}

  async searchRoute(input: {
    origin: string;
    destination: string;
    startDate: string;
    endDate: string;
  }): Promise<PriceQuote> {
    const rng = seededRandom(
      `${this.opts.seed ?? "default"}:${input.origin}:${input.destination}:${input.startDate}:${input.endDate}`
    );
    const amountUsd = Math.round((180 + rng() * 220) * 100) / 100;
    return {
      amountUsd,
      deeplink: "https://flightclaw.com",
      observedAt: mockNow(this.opts.fixedNowIso).toISOString()
    };
  }
}

export class FlightclawApiPriceTrackerAdapter implements PriceTrackerAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fallback?: PriceTrackerAdapter
  ) {}

  async searchRoute(input: {
    origin: string;
    destination: string;
    startDate: string;
    endDate: string;
  }): Promise<PriceQuote> {
    try {
      const query = new URLSearchParams({
        origin: input.origin,
        destination: input.destination,
        start_date: input.startDate,
        end_date: input.endDate
      });

      const url = `${this.baseUrl.replace(/\/$/, "")}/prices/search?${query.toString()}`;
      const raw = await fetchJsonWithRetry<unknown>(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      });

      const parsed = flightclawResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Invalid flightclaw payload");

      return mapFlightclawQuote(parsed.data);
    } catch (err) {
      if (this.fallback) return this.fallback.searchRoute(input);
      throw err;
    }
  }
}

function mapFlightclawQuote(resp: FlightclawResponse): PriceQuote {
  return {
    amountUsd: resp.bestPriceUsd,
    deeplink: resp.bookingLink,
    observedAt: new Date().toISOString()
  };
}
