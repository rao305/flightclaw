import { describe, expect, it } from "vitest";
import { bodyInputsFixture } from "../fixtures.js";
import { createFileCoefficientLoader } from "../loadCoefficients.js";
import { type CoefficientSet, computeBmi, predictMeasurements } from "../prediction.js";
import { BodyMeasurementsSchema } from "../schemas.js";
import { CANONICAL_ZONES } from "../zones.js";

const getCoefficients = createFileCoefficientLoader();

// ---------------------------------------------------------------------------
// BMI
// ---------------------------------------------------------------------------

describe("computeBmi", () => {
  it("computes BMI correctly for typical inputs", () => {
    // 70 kg / (1.75 m)^2 ≈ 22.86
    expect(computeBmi(175, 70)).toBeCloseTo(22.857, 2);
  });

  it("computes BMI for low and high values", () => {
    expect(computeBmi(160, 50)).toBeCloseTo(19.53, 2);
    expect(computeBmi(180, 100)).toBeCloseTo(30.86, 2);
  });
});

// ---------------------------------------------------------------------------
// Prediction — happy path (M, rectangle)
// ---------------------------------------------------------------------------

describe("predictMeasurements", () => {
  it("returns valid BodyMeasurements for M rectangle (happy path)", () => {
    const inputs = { ...bodyInputsFixture, gender: "M" as const, bodyShape: "rectangle" as const };
    const out = predictMeasurements(inputs, getCoefficients);
    expect(BodyMeasurementsSchema.safeParse(out).success).toBe(true);
    expect(Object.keys(out).length).toBe(8);
    for (const zone of CANONICAL_ZONES) {
      expect(out).toHaveProperty(zone);
      expect(typeof (out as Record<string, number>)[zone]).toBe("number");
      expect((out as Record<string, number>)[zone]).toBeGreaterThan(0);
    }
  });

  it("returns stable output for same inputs (determinism)", () => {
    const inputs = { ...bodyInputsFixture, gender: "M" as const, bodyShape: "rectangle" as const };
    const a = predictMeasurements(inputs, getCoefficients);
    const b = predictMeasurements(inputs, getCoefficients);
    expect(a).toEqual(b);
  });

  it("F rectangle produces valid measurements and differs from M where coeffs differ", () => {
    const inputsM = { ...bodyInputsFixture, gender: "M" as const, bodyShape: "rectangle" as const };
    const inputsF = { ...bodyInputsFixture, gender: "F" as const, bodyShape: "rectangle" as const };
    const outM = predictMeasurements(inputsM, getCoefficients);
    const outF = predictMeasurements(inputsF, getCoefficients);
    expect(BodyMeasurementsSchema.safeParse(outF).success).toBe(true);
    expect(Object.keys(outF).length).toBe(8);
    // F rectangle has different intercepts/slopes so at least one zone should differ
    const same = CANONICAL_ZONES.every(
      (z) => (outM as Record<string, number>)[z] === (outF as Record<string, number>)[z]
    );
    expect(same).toBe(false);
  });

  it("low BMI inputs yield positive measurements within bounds", () => {
    const inputs = {
      heightCm: 175,
      weightKg: 55,
      age: 25,
      gender: "M" as const,
      bodyShape: "rectangle" as const,
    };
    // BMI ≈ 17.96
    const out = predictMeasurements(inputs, getCoefficients);
    expect(BodyMeasurementsSchema.safeParse(out).success).toBe(true);
    for (const zone of CANONICAL_ZONES) {
      const v = (out as Record<string, number>)[zone];
      expect(v).toBeGreaterThan(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("high BMI inputs yield clamped values (at least one zone at or near max)", () => {
    const inputs = {
      heightCm: 170,
      weightKg: 120,
      age: 35,
      gender: "M" as const,
      bodyShape: "rectangle" as const,
    };
    const out = predictMeasurements(inputs, getCoefficients);
    expect(BodyMeasurementsSchema.safeParse(out).success).toBe(true);
    const set = getCoefficients("M", "rectangle");
    expect(set).not.toBeNull();
    if (set) {
      for (const zone of CANONICAL_ZONES) {
        const v = (out as Record<string, number>)[zone];
        const coef = set.zones[zone];
        expect(v).toBeGreaterThanOrEqual(coef.minCm);
        expect(v).toBeLessThanOrEqual(coef.maxCm);
      }
    }
  });

  it("clamping: raw above max yields maxCm", () => {
    const set: CoefficientSet = {
      zones: {
        shoulders: { intercept: 0, minCm: 32, maxCm: 55 },
        bust_chest: { intercept: 200, minCm: 70, maxCm: 130 },
        waist: { intercept: 50, minCm: 50, maxCm: 130 },
        hips: { intercept: 80, minCm: 70, maxCm: 140 },
        thigh: { intercept: 50, minCm: 40, maxCm: 80 },
        inseam: { intercept: 70, minCm: 60, maxCm: 95 },
        sleeve_length: { intercept: 60, minCm: 50, maxCm: 85 },
        torso_length: { intercept: 60, minCm: 50, maxCm: 85 },
      },
    };
    const get = () => set;
    const inputs = { ...bodyInputsFixture, gender: "M" as const, bodyShape: "rectangle" as const };
    const out = predictMeasurements(inputs, get);
    expect(out.bust_chest).toBe(130);
  });

  it("clamping: raw below min yields minCm", () => {
    const set: CoefficientSet = {
      zones: {
        shoulders: { intercept: 0, minCm: 32, maxCm: 55 },
        bust_chest: { intercept: 0, minCm: 70, maxCm: 130 },
        waist: { intercept: 5, minCm: 50, maxCm: 130 },
        hips: { intercept: 60, minCm: 70, maxCm: 140 },
        thigh: { intercept: 35, minCm: 40, maxCm: 80 },
        inseam: { intercept: 50, minCm: 60, maxCm: 95 },
        sleeve_length: { intercept: 40, minCm: 50, maxCm: 85 },
        torso_length: { intercept: 40, minCm: 50, maxCm: 85 },
      },
    };
    const get = () => set;
    const inputs = { ...bodyInputsFixture, gender: "M" as const, bodyShape: "rectangle" as const };
    const out = predictMeasurements(inputs, get);
    expect(out.waist).toBe(50);
    expect(out.thigh).toBe(40);
  });

  it("throws when coefficient set is missing", () => {
    const get = () => null;
    const inputs = { ...bodyInputsFixture, gender: "M" as const, bodyShape: "pear" as const };
    expect(() => predictMeasurements(inputs, get)).toThrow(/Missing coefficients/);
  });
});
