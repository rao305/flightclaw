import type { BodyMeasurements, ZoneKey } from "@sqairinch/shared";
import { CANONICAL_ZONES } from "@sqairinch/shared";
import { useEffect, useMemo, useState } from "react";
import { validateMeasurement } from "./validateMeasurements.js";

interface MeasurementOverridesPanelProps {
  predicted: BodyMeasurements | null;
  finals: BodyMeasurements | null;
  onChangeZone(zone: ZoneKey, value: number): void;
  onReset(): void;
}

type ZoneInputState = Partial<Record<ZoneKey, string>>;
type ZoneErrorState = Partial<Record<ZoneKey, string>>;

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  fontFamily: "sans-serif",
  fontSize: 12,
};

const headerStyle: React.CSSProperties = {
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 600,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "4px 6px",
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: "4px 6px",
  verticalAlign: "top",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  fontSize: 12,
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  color: "#b91c1c",
  fontSize: 11,
  marginTop: 2,
};

const resetRowStyle: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  justifyContent: "flex-end",
};

const resetButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
};

const ZONE_LABELS: Record<ZoneKey, string> = {
  shoulders: "Shoulders",
  bust_chest: "Bust / chest",
  waist: "Waist",
  hips: "Hips",
  thigh: "Thigh",
  inseam: "Inseam",
  sleeve_length: "Sleeve length",
  torso_length: "Torso length",
};

function formatCm(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)} cm`;
}

export function MeasurementOverridesPanel({
  predicted,
  finals,
  onChangeZone,
  onReset,
}: MeasurementOverridesPanelProps) {
  const [inputs, setInputs] = useState<ZoneInputState>({});
  const [errors, setErrors] = useState<ZoneErrorState>({});

  const hasPredicted = Boolean(predicted);

  // Keep local input state in sync when finals/predicted change externally.
  useEffect(() => {
    const next: ZoneInputState = {};
    for (const zone of CANONICAL_ZONES) {
      const v =
        (finals as BodyMeasurements | null)?.[zone] ??
        (predicted as BodyMeasurements | null)?.[zone];
      next[zone] = v != null && Number.isFinite(v) ? String(Math.round(v * 10) / 10) : "";
    }
    setInputs(next);
    setErrors({});
  }, [predicted, finals]);

  const rows = useMemo(() => CANONICAL_ZONES, []);

  const handleChange = (zone: ZoneKey, raw: string) => {
    setInputs((prev) => ({ ...prev, [zone]: raw }));
    // Clear error while editing; validation happens on blur.
    if (errors[zone]) {
      setErrors((prev) => {
        const { [zone]: _omit, ...next } = prev;
        return next;
      });
    }
  };

  const handleBlur = (zone: ZoneKey) => {
    const raw = (inputs[zone] ?? "").trim();
    if (raw === "") {
      setErrors((prev) => ({ ...prev, [zone]: "Required" }));
      return;
    }
    const parsed = Number(raw.replace(/,/g, "."));
    const message = validateMeasurement(zone, parsed);
    if (message) {
      setErrors((prev) => ({ ...prev, [zone]: message }));
      return;
    }
    onChangeZone(zone, parsed);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Manual measurement overrides</div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Zone</th>
            <th style={thStyle}>Predicted</th>
            <th style={thStyle}>Final (cm)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((zone) => {
            const key = zone as ZoneKey;
            const predictedValue = (predicted as BodyMeasurements | null)?.[key];
            const inputValue = inputs[key] ?? "";
            const error = errors[key];
            return (
              <tr key={key}>
                <td style={tdStyle}>{ZONE_LABELS[key]}</td>
                <td style={tdStyle}>{formatCm(predictedValue)}</td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.1}
                    style={inputStyle}
                    value={inputValue}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => handleBlur(key)}
                    aria-invalid={Boolean(error)}
                  />
                  {error && <div style={errorStyle}>{error}</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={resetRowStyle}>
        <button type="button" style={resetButtonStyle} onClick={onReset} disabled={!hasPredicted}>
          Reset to predicted
        </button>
      </div>
    </div>
  );
}
