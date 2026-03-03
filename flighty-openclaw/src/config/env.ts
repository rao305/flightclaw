import { z } from "zod";

const envSchema = z
  .object({
    DEMO_USER_KEY: z.string().min(1).default("whatsapp:+16692602830"),

    AVIATIONSTACK_API_KEY: z.string().optional(),
    FLIGHT_TRACKER_BASE_URL: z.string().url().optional(),
    FLIGHT_TRACKER_API_KEY: z.string().optional(),
    FLIGHTCLAW_BASE_URL: z.string().url().optional(),
    FLIGHTCLAW_API_KEY: z.string().optional(),

    DATABASE_URL: z.string().optional(),
    NOTIFY_WEBHOOK_URL: z.string().url().optional(),
    OPENCLAW_RELAY_URL: z.string().url().optional(),
    OPENCLAW_RELAY_TOKEN: z.string().optional(),

    START_BRIDGE: z.enum(["true", "false"]).default("false"),
    BRIDGE_PORT: z.coerce.number().int().min(1).max(65535).default(8788),

    LIVE_DATA_ONLY: z.enum(["true", "false"]).default("true"),
    MOCK_SEED: z.string().default("flighty-openclaw"),
    MOCK_FIXED_NOW: z.string().datetime({ offset: true }).optional()
  })
  .superRefine((env, ctx) => {
    if (env.FLIGHT_TRACKER_BASE_URL && !env.FLIGHT_TRACKER_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FLIGHT_TRACKER_API_KEY"],
        message: "FLIGHT_TRACKER_API_KEY is required when FLIGHT_TRACKER_BASE_URL is set"
      });
    }

    if (env.FLIGHTCLAW_BASE_URL && !env.FLIGHTCLAW_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FLIGHTCLAW_API_KEY"],
        message: "FLIGHTCLAW_API_KEY is required when FLIGHTCLAW_BASE_URL is set"
      });
    }

    const hasLiveFlightProvider = Boolean(env.AVIATIONSTACK_API_KEY || env.FLIGHT_TRACKER_BASE_URL);
    const hasLivePriceProvider = Boolean(env.FLIGHTCLAW_BASE_URL);

    if (env.LIVE_DATA_ONLY === "true") {
      if (!hasLiveFlightProvider) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["LIVE_DATA_ONLY"],
          message: "LIVE_DATA_ONLY=true requires a live flight provider (AVIATIONSTACK_API_KEY or FLIGHT_TRACKER_BASE_URL+FLIGHT_TRACKER_API_KEY)"
        });
      }

      if (!hasLivePriceProvider) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["LIVE_DATA_ONLY"],
          message: "LIVE_DATA_ONLY=true requires FLIGHTCLAW_BASE_URL+FLIGHTCLAW_API_KEY"
        });
      }
    }
  });

export type RuntimeConfig = z.infer<typeof envSchema> & {
  startBridge: boolean;
  liveDataOnly: boolean;
};

export function loadRuntimeConfig(source: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid runtime configuration: ${details}`);
  }

  return {
    ...parsed.data,
    startBridge: parsed.data.START_BRIDGE === "true",
    liveDataOnly: parsed.data.LIVE_DATA_ONLY === "true"
  };
}
