import { z } from "zod";
import type { FlightRef } from "../types/models.js";

export type Intent =
  | { type: "track_flight"; payload: FlightRef }
  | { type: "next_flight" }
  | {
      type: "price_watch_create";
      payload: {
        origin: string;
        destination: string;
        startDate: string;
        endDate: string;
        targetPriceUsd: number;
      };
    }
  | { type: "price_watch_list" }
  | { type: "unknown"; raw: string };

const trackFlightRegex = /track\s+([A-Za-z]{2})\s*(\d+)\s+on\s+(\d{4}-\d{2}-\d{2})\s+from\s+([A-Za-z]{3})\s+to\s+([A-Za-z]{3})/i;
const priceRegex = /alert me when\s+([A-Za-z]{3})\s*-?>\s*([A-Za-z]{3}).*?(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2}).*?below\s*\$?(\d+)/i;

const flightSchema = z.object({
  airlineCode: z.string().min(2).max(3),
  flightNumber: z.string().min(1),
  flightDate: z.string(),
  departureAirport: z.string().length(3).optional(),
  arrivalAirport: z.string().length(3).optional()
});

export function parseIntent(input: string): Intent {
  const normalized = input.trim();

  const tf = normalized.match(trackFlightRegex);
  if (tf) {
    const payload = {
      airlineCode: tf[1]!.toUpperCase(),
      flightNumber: tf[2]!,
      flightDate: tf[3]!,
      departureAirport: tf[4]!.toUpperCase(),
      arrivalAirport: tf[5]!.toUpperCase()
    };
    const parsed = flightSchema.safeParse(payload);
    if (parsed.success) return { type: "track_flight", payload: parsed.data };
  }

  const pw = normalized.match(priceRegex);
  if (pw) {
    return {
      type: "price_watch_create",
      payload: {
        origin: pw[1]!.toUpperCase(),
        destination: pw[2]!.toUpperCase(),
        startDate: pw[3]!,
        endDate: pw[4]!,
        targetPriceUsd: Number(pw[5]!)
      }
    };
  }

  if (/next flight/i.test(normalized)) return { type: "next_flight" };
  if (/list my price alerts|list price/i.test(normalized)) return { type: "price_watch_list" };

  return { type: "unknown", raw: input };
}
