import type { BodyShape } from "./enums.js";
import type { Gender } from "./enums.js";
import type { BodyInputs, BodyMeasurements } from "./schemas.js";
import type { ZoneKey } from "./zones.js";

/** Per-zone regression coefficients and clamp bounds. */
export interface ZoneCoefficients {
  intercept: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  age?: number;
  minCm: number;
  maxCm: number;
}

/** Coefficient set keyed by zone. */
export interface CoefficientSet {
  zones: Record<ZoneKey, ZoneCoefficients>;
}

/** Loader: (gender, bodyShape) => coefficient set or null. */
export type GetCoefficients = (gender: Gender, bodyShape: BodyShape) => CoefficientSet | null;

/**
 * Computes BMI from height (cm) and weight (kg).
 * Formula: weightKg / (heightCm/100)^2
 */
export function computeBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function clamp(value: number, minCm: number, maxCm: number): number {
  return Math.max(minCm, Math.min(maxCm, value));
}

/**
 * Predicts body measurements from inputs using a coefficient set.
 * Same inputs + same getCoefficients always yield the same output (deterministic).
 * @throws if getCoefficients returns null for inputs.gender and inputs.bodyShape
 */
export function predictMeasurements(
  inputs: BodyInputs,
  getCoefficients: GetCoefficients
): BodyMeasurements {
  const set = getCoefficients(inputs.gender, inputs.bodyShape);
  if (set == null) {
    throw new Error(
      `Missing coefficients for gender=${inputs.gender} bodyShape=${inputs.bodyShape}`
    );
  }

  const bmi = computeBmi(inputs.heightCm, inputs.weightKg);
  const result: BodyMeasurements = {} as BodyMeasurements;

  for (const zone of Object.keys(set.zones) as ZoneKey[]) {
    const coef = set.zones[zone];
    if (coef == null) continue;

    const raw =
      coef.intercept +
      (coef.heightCm ?? 0) * inputs.heightCm +
      (coef.weightKg ?? 0) * inputs.weightKg +
      (coef.bmi ?? 0) * bmi +
      (coef.age ?? 0) * inputs.age;

    const clamped = clamp(raw, coef.minCm, coef.maxCm);
    result[zone] = clamped;
  }

  return result;
}
