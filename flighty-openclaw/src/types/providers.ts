import { z } from "zod";

export const aviationStackResponseSchema = z.object({
  data: z.array(
    z.object({
      flight_status: z.string().optional(),
      departure: z
        .object({
          scheduled: z.string().nullable().optional(),
          estimated: z.string().nullable().optional(),
          actual: z.string().nullable().optional(),
          gate: z.string().nullable().optional()
        })
        .optional(),
      arrival: z
        .object({
          scheduled: z.string().nullable().optional(),
          estimated: z.string().nullable().optional(),
          actual: z.string().nullable().optional(),
          gate: z.string().nullable().optional()
        })
        .optional(),
      aircraft: z
        .object({
          iata: z.string().nullable().optional(),
          registration: z.string().nullable().optional()
        })
        .optional(),
      live: z
        .object({
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
          altitude: z.number().nullable().optional(),
          speed_horizontal: z.number().nullable().optional()
        })
        .optional()
    })
  )
});

export const flightclawResponseSchema = z.object({
  bestPriceUsd: z.number(),
  bookingLink: z.string().url().optional(),
  quotes: z
    .array(
      z.object({
        priceUsd: z.number(),
        airline: z.string().optional(),
        deeplink: z.string().url().optional()
      })
    )
    .optional()
});

export type AviationStackResponse = z.infer<typeof aviationStackResponseSchema>;
export type FlightclawResponse = z.infer<typeof flightclawResponseSchema>;
