export const IN_TO_CM = 2.54;
export const CM_TO_IN = 1 / IN_TO_CM;
export const LB_TO_KG = 0.453592;
export const KG_TO_LB = 1 / LB_TO_KG;

export type HeightUnit = "cm" | "in";
export type WeightUnit = "kg" | "lb";

/** Convert display value to canonical height in cm. */
export function toHeightCm(value: number, unit: HeightUnit): number {
  return unit === "in" ? value * IN_TO_CM : value;
}

/** Convert display value to canonical weight in kg. */
export function toWeightKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value * LB_TO_KG : value;
}

/** Convert canonical height (cm) to display value in chosen unit. */
export function fromHeightCm(cm: number, unit: HeightUnit): number {
  return unit === "in" ? cm * CM_TO_IN : cm;
}

/** Convert canonical weight (kg) to display value in chosen unit. */
export function fromWeightKg(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * KG_TO_LB : kg;
}
