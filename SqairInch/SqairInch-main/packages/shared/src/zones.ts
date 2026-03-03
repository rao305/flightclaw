import { z } from "zod";

export const CANONICAL_ZONES = [
  "shoulders",
  "bust_chest",
  "waist",
  "hips",
  "thigh",
  "inseam",
  "sleeve_length",
  "torso_length",
] as const;

export type ZoneKey = (typeof CANONICAL_ZONES)[number];

/** Zod schema for validating a canonical zone key at runtime. */
export const ZoneKeySchema = z.enum(CANONICAL_ZONES);
