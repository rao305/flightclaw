import { type BodyShape, BodyShapeEnum, type Gender, GenderEnum } from "@sqairinch/shared";
import { useCallback, useState } from "react";
import { useWidgetDispatch, useWidgetReset } from "../state/context.js";
import { predictBodyMeasurements } from "./prediction.js";
import {
  type HeightUnit,
  type WeightUnit,
  fromHeightCm,
  fromWeightKg,
  toHeightCm,
  toWeightKg,
} from "./units.js";
import type { AvatarFormValues, UnitMode } from "./validate.js";
import { validateAvatarForm } from "./validate.js";

const formStyle: React.CSSProperties = {
  fontFamily: "sans-serif",
  padding: "16px",
};
const fieldStyle: React.CSSProperties = {
  marginBottom: "12px",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "4px",
  fontSize: "14px",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "240px",
  padding: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};
const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#c00",
  marginTop: "4px",
};
const buttonStyle: React.CSSProperties = {
  marginRight: "8px",
  marginTop: "8px",
  padding: "8px 16px",
  cursor: "pointer",
};

const GENDER_LABELS: Record<Gender, string> = {
  M: "Male",
  F: "Female",
  NB: "Non-binary",
};

const BODY_SHAPE_LABELS: Record<BodyShape, string> = {
  rectangle: "Rectangle",
  pear: "Pear",
  apple: "Apple",
  hourglass: "Hourglass",
  inverted_triangle: "Inverted triangle",
};

const initialForm: AvatarFormValues = {
  height: "175",
  weight: "72",
  age: "28",
  gender: "M",
  bodyShape: "rectangle",
};

function parseNum(s: string): number {
  const trimmed = s.replace(/,/g, ".").trim();
  if (trimmed === "") return Number.NaN;
  return Number(trimmed);
}

export function AvatarForm() {
  const dispatch = useWidgetDispatch();
  const reset = useWidgetReset();
  const [unitMode, setUnitMode] = useState<UnitMode>("metric");
  const [form, setForm] = useState<AvatarFormValues>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const heightUnit: HeightUnit = unitMode === "metric" ? "cm" : "in";
  const weightUnit: WeightUnit = unitMode === "metric" ? "kg" : "lb";

  const handleUnitToggle = useCallback(() => {
    const nextMode: UnitMode = unitMode === "metric" ? "imperial" : "metric";
    const nextHeightUnit: HeightUnit = nextMode === "metric" ? "cm" : "in";
    const nextWeightUnit: WeightUnit = nextMode === "metric" ? "kg" : "lb";
    const heightNum = parseNum(form.height);
    const weightNum = parseNum(form.weight);
    const heightCm = toHeightCm(heightNum, heightUnit);
    const weightKg = toWeightKg(weightNum, weightUnit);
    const newHeight =
      Number.isFinite(heightCm) && heightCm > 0
        ? String(Math.round(fromHeightCm(heightCm, nextHeightUnit) * 10) / 10)
        : form.height;
    const newWeight =
      Number.isFinite(weightKg) && weightKg > 0
        ? String(Math.round(fromWeightKg(weightKg, nextWeightUnit) * 10) / 10)
        : form.weight;
    setUnitMode(nextMode);
    setForm((prev) => ({ ...prev, height: newHeight, weight: newWeight }));
    setErrors({});
  }, [unitMode, form.height, form.weight, heightUnit, weightUnit]);

  const handleSubmit = useCallback(() => {
    const result = validateAvatarForm(form, unitMode);
    if (result.ok) {
      setErrors({});
      const bodyInputs = result.data;
      const predicted = predictBodyMeasurements(bodyInputs);
      dispatch({ type: "SET_PREDICTED_MEASUREMENTS", payload: predicted });
      // Initialize finals to predicted on first submit; they may later be
      // overridden or reloaded from persistence.
      dispatch({ type: "SET_FINAL_MEASUREMENTS", payload: predicted });
      dispatch({ type: "SUBMIT_AVATAR", payload: bodyInputs });
    } else {
      setErrors(result.errors);
    }
  }, [form, unitMode, dispatch]);

  return (
    <div style={formStyle}>
      <div style={fieldStyle}>
        <span style={labelStyle}>Units</span>
        <button type="button" style={buttonStyle} onClick={handleUnitToggle}>
          {unitMode === "metric" ? "in / lb" : "cm / kg"}
        </button>
        <span style={{ marginLeft: 8, fontSize: 14 }}>
          (using {unitMode === "metric" ? "cm / kg" : "in / lb"})
        </span>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="avatar-height" style={labelStyle}>
          Height ({heightUnit})
        </label>
        <input
          id="avatar-height"
          type="number"
          min={heightUnit === "cm" ? 1 : 1}
          max={heightUnit === "cm" ? 300 : 118}
          step={heightUnit === "cm" ? 1 : 0.1}
          style={inputStyle}
          value={form.height}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, height: e.target.value }));
            if (errors.height)
              setErrors((prev) => {
                const { height, ...next } = prev;
                return next;
              });
          }}
          aria-invalid={Boolean(errors.height)}
        />
        {errors.height && <p style={errorStyle}>{errors.height}</p>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="avatar-weight" style={labelStyle}>
          Weight ({weightUnit})
        </label>
        <input
          id="avatar-weight"
          type="number"
          min={weightUnit === "kg" ? 1 : 2}
          max={weightUnit === "kg" ? 500 : 1102}
          step={weightUnit === "kg" ? 1 : 0.1}
          style={inputStyle}
          value={form.weight}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, weight: e.target.value }));
            if (errors.weight)
              setErrors((prev) => {
                const { weight, ...next } = prev;
                return next;
              });
          }}
          aria-invalid={Boolean(errors.weight)}
        />
        {errors.weight && <p style={errorStyle}>{errors.weight}</p>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="avatar-age" style={labelStyle}>
          Age
        </label>
        <input
          id="avatar-age"
          type="number"
          min={10}
          max={120}
          step={1}
          style={inputStyle}
          value={form.age}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, age: e.target.value }));
            if (errors.age)
              setErrors((prev) => {
                const { age, ...next } = prev;
                return next;
              });
          }}
          aria-invalid={Boolean(errors.age)}
        />
        {errors.age && <p style={errorStyle}>{errors.age}</p>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="avatar-gender" style={labelStyle}>
          Gender
        </label>
        <select
          id="avatar-gender"
          style={inputStyle}
          value={form.gender}
          onChange={(e) => {
            const v = e.target.value as Gender;
            if (GenderEnum[v] !== undefined) setForm((prev) => ({ ...prev, gender: v }));
            if (errors.gender)
              setErrors((prev) => {
                const { gender, ...next } = prev;
                return next;
              });
          }}
          aria-invalid={Boolean(errors.gender)}
        >
          {(Object.keys(GenderEnum) as Gender[]).map((g) => (
            <option key={g} value={g}>
              {GENDER_LABELS[g]}
            </option>
          ))}
        </select>
        {errors.gender && <p style={errorStyle}>{errors.gender}</p>}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="avatar-bodyshape" style={labelStyle}>
          Body shape
        </label>
        <select
          id="avatar-bodyshape"
          style={inputStyle}
          value={form.bodyShape}
          onChange={(e) => {
            const v = e.target.value as BodyShape;
            if (BodyShapeEnum[v] !== undefined) setForm((prev) => ({ ...prev, bodyShape: v }));
            if (errors.bodyShape)
              setErrors((prev) => {
                const { bodyShape, ...next } = prev;
                return next;
              });
          }}
          aria-invalid={Boolean(errors.bodyShape)}
        >
          {(Object.keys(BODY_SHAPE_LABELS) as BodyShape[]).map((s) => (
            <option key={s} value={s}>
              {BODY_SHAPE_LABELS[s]}
            </option>
          ))}
        </select>
        {errors.bodyShape && <p style={errorStyle}>{errors.bodyShape}</p>}
      </div>

      <div>
        <button type="button" style={buttonStyle} onClick={handleSubmit}>
          Submit
        </button>
        <button type="button" style={buttonStyle} onClick={reset}>
          Reset
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => dispatch({ type: "ERROR", payload: "Simulated error" })}
        >
          Simulate error
        </button>
      </div>
    </div>
  );
}
