import { type BodyInputs, BodyInputsSchema, type BodyShape, type Gender } from "@sqairinch/shared";
import { type HeightUnit, type WeightUnit, toHeightCm, toWeightKg } from "./units.js";

export type UnitMode = "metric" | "imperial";

export interface AvatarFormValues {
  height: string;
  weight: string;
  age: string;
  gender: Gender;
  bodyShape: BodyShape;
}

const HEIGHT_CM_MIN = 1;
const HEIGHT_CM_MAX = 300;
const WEIGHT_KG_MIN = 1;
const WEIGHT_KG_MAX = 500;
const AGE_MIN = 10;
const AGE_MAX = 120;

function parseNum(s: string): number {
  const trimmed = s.replace(/,/g, ".").trim();
  if (trimmed === "") return Number.NaN;
  return Number(trimmed);
}

function friendlyHeightMessage(unit: HeightUnit): string {
  if (unit === "cm") return `Enter height between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm`;
  const minIn = Math.round(HEIGHT_CM_MIN * 0.393701);
  const maxIn = Math.round(HEIGHT_CM_MAX * 0.393701);
  return `Enter height between ${minIn} and ${maxIn} in`;
}

function friendlyWeightMessage(unit: WeightUnit): string {
  if (unit === "kg") return `Enter weight between ${WEIGHT_KG_MIN} and ${WEIGHT_KG_MAX} kg`;
  const minLb = Math.round(WEIGHT_KG_MIN * 2.20462);
  const maxLb = Math.round(WEIGHT_KG_MAX * 2.20462);
  return `Enter weight between ${minLb} and ${maxLb} lb`;
}

export type ValidationResult =
  | { ok: true; data: BodyInputs }
  | { ok: false; errors: Record<string, string> };

export function validateAvatarForm(form: AvatarFormValues, unitMode: UnitMode): ValidationResult {
  const heightUnit: HeightUnit = unitMode === "metric" ? "cm" : "in";
  const weightUnit: WeightUnit = unitMode === "metric" ? "kg" : "lb";

  const heightNum = parseNum(form.height);
  const weightNum = parseNum(form.weight);
  const ageNum = parseNum(form.age);
  const ageInt = Number.isFinite(ageNum) ? Math.round(ageNum) : ageNum;

  const heightCm = toHeightCm(heightNum, heightUnit);
  const weightKg = toWeightKg(weightNum, weightUnit);

  const payload = {
    heightCm: Number.isFinite(heightCm) ? heightCm : 0,
    weightKg: Number.isFinite(weightKg) ? weightKg : 0,
    age: ageInt,
    gender: form.gender,
    bodyShape: form.bodyShape,
  };

  const result = BodyInputsSchema.safeParse(payload);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  const flat = result.error.flatten();
  if (flat.fieldErrors.heightCm?.length) {
    errors.height = friendlyHeightMessage(heightUnit);
  }
  if (flat.fieldErrors.weightKg?.length) {
    errors.weight = friendlyWeightMessage(weightUnit);
  }
  if (flat.fieldErrors.age?.length) {
    errors.age = `Enter age between ${AGE_MIN} and ${AGE_MAX}.`;
  }
  if (flat.fieldErrors.gender?.length) {
    errors.gender = "Please select a gender.";
  }
  if (flat.fieldErrors.bodyShape?.length) {
    errors.bodyShape = "Please select a body shape.";
  }
  return { ok: false, errors };
}
