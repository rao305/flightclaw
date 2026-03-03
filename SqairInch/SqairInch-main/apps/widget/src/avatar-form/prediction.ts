import type {
  BodyInputs,
  BodyMeasurements,
  CoefficientSet,
  GetCoefficients,
} from "@sqairinch/shared";
import { predictMeasurements } from "@sqairinch/shared";

/**
 * Lightweight coefficient loader for the widget.
 *
 * NOTE: This is intentionally hard-coded for the initial M/F rectangle cases
 * to avoid using the Node-based file loader in the browser bundle.
 */
const widgetCoefficients: Record<string, CoefficientSet> = {
  M_rectangle: {
    zones: {
      shoulders: {
        intercept: 28,
        heightCm: 0.18,
        weightKg: 0.05,
        bmi: 0.2,
        age: 0.02,
        minCm: 32,
        maxCm: 55,
      },
      bust_chest: {
        intercept: 60,
        heightCm: 0.22,
        weightKg: 0.35,
        bmi: 0.4,
        age: 0.01,
        minCm: 70,
        maxCm: 130,
      },
      waist: {
        intercept: 45,
        heightCm: 0.15,
        weightKg: 0.42,
        bmi: 0.5,
        age: 0.02,
        minCm: 50,
        maxCm: 130,
      },
      hips: {
        intercept: 65,
        heightCm: 0.2,
        weightKg: 0.38,
        bmi: 0.35,
        age: 0.01,
        minCm: 70,
        maxCm: 140,
      },
      thigh: {
        intercept: 38,
        heightCm: 0.08,
        weightKg: 0.25,
        bmi: 0.3,
        age: 0.01,
        minCm: 40,
        maxCm: 80,
      },
      inseam: {
        intercept: 70,
        heightCm: 0.12,
        weightKg: 0.05,
        bmi: 0.1,
        age: 0.01,
        minCm: 60,
        maxCm: 95,
      },
      sleeve_length: {
        intercept: 60,
        heightCm: 0.11,
        weightKg: 0.04,
        bmi: 0.12,
        age: 0.01,
        minCm: 50,
        maxCm: 85,
      },
      torso_length: {
        intercept: 60,
        heightCm: 0.13,
        weightKg: 0.06,
        bmi: 0.15,
        age: 0.01,
        minCm: 50,
        maxCm: 85,
      },
    },
  },
  F_rectangle: {
    zones: {
      shoulders: {
        intercept: 30,
        heightCm: 0.16,
        weightKg: 0.04,
        bmi: 0.18,
        age: 0.01,
        minCm: 32,
        maxCm: 52,
      },
      bust_chest: {
        intercept: 68,
        heightCm: 0.2,
        weightKg: 0.32,
        bmi: 0.45,
        age: 0.01,
        minCm: 72,
        maxCm: 130,
      },
      waist: {
        intercept: 52,
        heightCm: 0.14,
        weightKg: 0.4,
        bmi: 0.48,
        age: 0.02,
        minCm: 52,
        maxCm: 130,
      },
      hips: {
        intercept: 72,
        heightCm: 0.18,
        weightKg: 0.35,
        bmi: 0.38,
        age: 0.01,
        minCm: 75,
        maxCm: 145,
      },
      thigh: {
        intercept: 42,
        heightCm: 0.07,
        weightKg: 0.23,
        bmi: 0.28,
        age: 0.01,
        minCm: 40,
        maxCm: 78,
      },
      inseam: {
        intercept: 68,
        heightCm: 0.11,
        weightKg: 0.04,
        bmi: 0.1,
        age: 0.01,
        minCm: 60,
        maxCm: 94,
      },
      sleeve_length: {
        intercept: 58,
        heightCm: 0.1,
        weightKg: 0.03,
        bmi: 0.11,
        age: 0.01,
        minCm: 50,
        maxCm: 84,
      },
      torso_length: {
        intercept: 58,
        heightCm: 0.12,
        weightKg: 0.05,
        bmi: 0.14,
        age: 0.01,
        minCm: 50,
        maxCm: 84,
      },
    },
  },
};

const getCoefficients: GetCoefficients = (gender, bodyShape) => {
  const key = `${gender}_${bodyShape}`;
  const set = widgetCoefficients[key];
  return set ?? null;
};

export function predictBodyMeasurements(inputs: BodyInputs): BodyMeasurements {
  return predictMeasurements(inputs, getCoefficients);
}
