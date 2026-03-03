import type { BodyInputs, SkuResponse, WidgetConfig } from "@sqairinch/shared";

interface FitResultProps {
  sku: SkuResponse;
  inputs: BodyInputs;
  config: WidgetConfig;
  onBack: () => void;
}

export function FitResult({ sku, inputs: _inputs, config: _config, onBack }: FitResultProps) {
  const zones = Object.entries(sku.measurementsCm);
  const hasZones = zones.length > 0;

  return (
    <div style={{ fontFamily: "sans-serif", padding: "16px" }}>
      <p>
        <strong>Size:</strong> {sku.sizeLabel}
      </p>
      <p>
        <strong>Category:</strong> {sku.category}
      </p>
      <p>
        <strong>Fabric:</strong> {sku.fabricType}
      </p>

      {hasZones ? (
        <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "12px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Zone</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>Measurement (cm)</th>
            </tr>
          </thead>
          <tbody>
            {zones.map(([zone, value]) => (
              <tr key={zone}>
                <td style={{ padding: "4px 8px" }}>{zone}</td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "#666" }}>No zone data available.</p>
      )}

      <button type="button" onClick={onBack} style={{ marginTop: "16px" }}>
        Edit Measurements
      </button>
    </div>
  );
}
