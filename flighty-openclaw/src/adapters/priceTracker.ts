import type { PriceQuote } from "../types/models.js";
import type { FlightclawResponse } from "../types/providers.js";
import { flightclawResponseSchema } from "../types/providers.js";
import { fetchJsonWithRetry } from "../utils/http.js";

export interface PriceTrackerAdapter {
  searchRoute(input: {
    origin: string;
    destination: string;
    startDate: string;
    endDate: string;
  }): Promise<PriceQuote>;
}

export class MockPriceTrackerAdapter implements PriceTrackerAdapter {
  async searchRoute(): Promise<PriceQuote> {
    const amountUsd = Math.round((180 + Math.random() * 220) * 100) / 100;
    return {
      amountUsd,
      deeplink: "https://flightclaw.com",
      observedAt: new Date().toISOString()
    };
  }
}

export class FlightclawApiPriceTrackerAdapter implements PriceTrackerAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fallback: PriceTrackerAdapter = new MockPriceTrackerAdapter()
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
    } catch {
      return this.fallback.searchRoute(input);
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
