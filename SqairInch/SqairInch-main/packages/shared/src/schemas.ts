import { z } from "zod";
import {
  BodyShapeSchema,
  FabricTypeSchema,
  FitClassSchema,
  GarmentCategorySchema,
  GenderSchema,
} from "./enums.js";
import { ZoneKeySchema } from "./zones.js";

// Private base — a record keyed by canonical zone with positive number values
const MeasurementMapSchema = z.record(ZoneKeySchema, z.number().positive());

export const BodyMeasurementsSchema = MeasurementMapSchema;
export type BodyMeasurements = z.infer<typeof BodyMeasurementsSchema>;

export const GarmentMeasurementsSchema = MeasurementMapSchema;
export type GarmentMeasurements = z.infer<typeof GarmentMeasurementsSchema>;

export const BodyInputsSchema = z.object({
  heightCm: z.number().positive().max(300),
  weightKg: z.number().positive().max(500),
  age: z.number().int().min(10).max(120),
  gender: GenderSchema,
  bodyShape: BodyShapeSchema,
});
export type BodyInputs = z.infer<typeof BodyInputsSchema>;

/** @deprecated Use BodyInputs instead */
export type AvatarInputs = BodyInputs;

export const WidgetConfigSchema = z.object({
  version: z.string().min(1),
  enabledZones: z.array(ZoneKeySchema).min(1),
  baseTolerancesCm: z.record(ZoneKeySchema, z.number()),
  fabricMultipliers: z.object({
    STRETCHY: z.number().positive(),
    MODERATE: z.number().positive(),
    STIFF: z.number().positive(),
  }),
  branding: z.object({
    poweredBy: z.boolean(),
    poweredByText: z.string(),
  }),
  uiFlags: z.object({
    enableOverlay: z.boolean(),
    enableRecommendation: z.boolean(),
    debug: z.boolean(),
  }),
});
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

export const SkuResponseSchema = z.object({
  variantId: z.string().min(1),
  sizeLabel: z.string().min(1),
  category: GarmentCategorySchema,
  fabricType: FabricTypeSchema,
  unit: z.literal("cm"),
  imageUrl: z.string().url().optional(),
  measurementsCm: z.record(ZoneKeySchema, z.number().positive()),
  updatedAt: z.string().datetime(),
});
export type SkuResponse = z.infer<typeof SkuResponseSchema>;

export const EventTypeSchema = z.enum([
  "widget_open",
  "avatar_created",
  "avatar_override",
  "tryon_requested",
  "fit_result_shown",
  "error",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EventPayloadSchema = z.object({
  type: z.string().min(1),
  sessionId: z.string().min(1),
  variantId: z.string().optional(),
  timestamp: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});
export type EventPayload = z.infer<typeof EventPayloadSchema>;

export const FitZoneResultSchema = z.object({
  zone: ZoneKeySchema,
  diffCm: z.number(),
  tolCm: z.number().nonnegative(),
  classification: FitClassSchema,
  severity: z.number().min(0).max(1),
});
export type FitZoneResult = z.infer<typeof FitZoneResultSchema>;

export const FitResultSchema = z.object({
  zones: z.array(FitZoneResultSchema),
  summary: z.object({
    tightZones: z.array(ZoneKeySchema),
    looseZones: z.array(ZoneKeySchema),
    perfectZones: z.array(ZoneKeySchema),
  }),
  recommendation: z.string().optional(),
});
export type FitResult = z.infer<typeof FitResultSchema>;
