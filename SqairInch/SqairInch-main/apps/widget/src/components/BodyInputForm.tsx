import { type BodyInputs, BodyInputsSchema } from "@sqairinch/shared";
import { useState } from "react";

interface BodyInputFormProps {
  onSubmit: (inputs: BodyInputs) => void;
  loading: boolean;
}

interface FormValues {
  heightCm: string;
  weightKg: string;
  age: string;
  gender: string;
  bodyShape: string;
}

interface FieldErrors {
  heightCm?: string;
  weightKg?: string;
  age?: string;
  gender?: string;
  bodyShape?: string;
}

function parseFormValues(values: FormValues): unknown {
  return {
    heightCm: values.heightCm === "" ? undefined : Number(values.heightCm),
    weightKg: values.weightKg === "" ? undefined : Number(values.weightKg),
    age: values.age === "" ? undefined : Number(values.age),
    gender: values.gender === "" ? undefined : values.gender,
    bodyShape: values.bodyShape === "" ? undefined : values.bodyShape,
  };
}

function extractFieldErrors(values: FormValues): FieldErrors {
  const result = BodyInputsSchema.safeParse(parseFormValues(values));
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FieldErrors;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export function BodyInputForm({ onSubmit, loading }: BodyInputFormProps) {
  const [values, setValues] = useState<FormValues>({
    heightCm: "",
    weightKg: "",
    age: "",
    gender: "",
    bodyShape: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const fieldErrors = extractFieldErrors(values);
  const hasErrors = Object.keys(fieldErrors).length > 0;

  function handleChange(field: keyof FormValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleBlur(field: keyof FormValues) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function showError(field: keyof FormValues): string | undefined {
    if (submitted || touched[field]) return fieldErrors[field];
    return undefined;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    const parsed = BodyInputsSchema.safeParse(parseFormValues(values));
    if (parsed.success) {
      onSubmit(parsed.data);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: "sans-serif", padding: "16px" }} noValidate>
      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="sqai-height">Height (cm)</label>
        <input
          id="sqai-height"
          type="number"
          value={values.heightCm}
          onChange={(e) => handleChange("heightCm", e.target.value)}
          onBlur={() => handleBlur("heightCm")}
          aria-invalid={!!showError("heightCm")}
          aria-describedby={showError("heightCm") ? "sqai-height-err" : undefined}
        />
        {showError("heightCm") && (
          <span id="sqai-height-err" role="alert" style={{ color: "#c00", fontSize: "12px" }}>
            {showError("heightCm")}
          </span>
        )}
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="sqai-weight">Weight (kg)</label>
        <input
          id="sqai-weight"
          type="number"
          value={values.weightKg}
          onChange={(e) => handleChange("weightKg", e.target.value)}
          onBlur={() => handleBlur("weightKg")}
          aria-invalid={!!showError("weightKg")}
          aria-describedby={showError("weightKg") ? "sqai-weight-err" : undefined}
        />
        {showError("weightKg") && (
          <span id="sqai-weight-err" role="alert" style={{ color: "#c00", fontSize: "12px" }}>
            {showError("weightKg")}
          </span>
        )}
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="sqai-age">Age</label>
        <input
          id="sqai-age"
          type="number"
          value={values.age}
          onChange={(e) => handleChange("age", e.target.value)}
          onBlur={() => handleBlur("age")}
          aria-invalid={!!showError("age")}
          aria-describedby={showError("age") ? "sqai-age-err" : undefined}
        />
        {showError("age") && (
          <span id="sqai-age-err" role="alert" style={{ color: "#c00", fontSize: "12px" }}>
            {showError("age")}
          </span>
        )}
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="sqai-gender">Gender</label>
        <select
          id="sqai-gender"
          value={values.gender}
          onChange={(e) => handleChange("gender", e.target.value)}
          onBlur={() => handleBlur("gender")}
          aria-invalid={!!showError("gender")}
          aria-describedby={showError("gender") ? "sqai-gender-err" : undefined}
        >
          <option value="">Select…</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="NB">Non-binary</option>
        </select>
        {showError("gender") && (
          <span id="sqai-gender-err" role="alert" style={{ color: "#c00", fontSize: "12px" }}>
            {showError("gender")}
          </span>
        )}
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label htmlFor="sqai-shape">Body Shape</label>
        <select
          id="sqai-shape"
          value={values.bodyShape}
          onChange={(e) => handleChange("bodyShape", e.target.value)}
          onBlur={() => handleBlur("bodyShape")}
          aria-invalid={!!showError("bodyShape")}
          aria-describedby={showError("bodyShape") ? "sqai-shape-err" : undefined}
        >
          <option value="">Select…</option>
          <option value="rectangle">Rectangle</option>
          <option value="pear">Pear</option>
          <option value="apple">Apple</option>
          <option value="hourglass">Hourglass</option>
          <option value="inverted_triangle">Inverted Triangle</option>
        </select>
        {showError("bodyShape") && (
          <span id="sqai-shape-err" role="alert" style={{ color: "#c00", fontSize: "12px" }}>
            {showError("bodyShape")}
          </span>
        )}
      </div>

      <button type="submit" disabled={loading || (submitted && hasErrors)}>
        {loading ? "Loading…" : "Find My Fit"}
      </button>
    </form>
  );
}
