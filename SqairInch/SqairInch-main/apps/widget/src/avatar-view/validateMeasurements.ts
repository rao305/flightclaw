import type { ZoneKey } from "@sqairinch/shared";

export type MeasurementErrors = Partial<Record<ZoneKey, string>>;

// Simple, conservative ranges per zone in cm.
const MIN_CM: Partial<Record<ZoneKey, number>> = {
  shoulders: 30,
  bust_chest: 60,
  waist: 50,
  hips: 70,
  thigh: 35,
  inseam: 60,
  sleeve_length: 45,
  torso_length: 45,
};

const MAX_CM: Partial<Record<ZoneKey, number>> = {
  shoulders: 60,
  bust_chest: 150,
  waist: 150,
  hips: 160,
  thigh: 90,
  inseam: 110,
  sleeve_length: 95,
  torso_length: 95,
};

export function validateMeasurement(zone: ZoneKey, value: number): string | null {
  const min = MIN_CM[zone] ?? 40;
  const max = MAX_CM[zone] ?? 200;
  if (!Number.isFinite(value)) return "Enter a valid number";
  if (value < min || value > max) {
    return `Must be between ${min} and ${max} cm`;
  }
  return null;
}
