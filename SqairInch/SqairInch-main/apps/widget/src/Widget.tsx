import { bodyMeasurementsFixture } from "@sqairinch/shared";
import { useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary.js";
import { AvatarForm } from "./avatar-form/AvatarForm.js";
import { AvatarSvg } from "./avatar-view/AvatarSvg.js";
import { MeasurementOverridesPanel } from "./avatar-view/MeasurementOverridesPanel.js";
import {
  WidgetProvider,
  useWidgetDispatch,
  useWidgetReset,
  useWidgetState,
} from "./state/context.js";
import type { RuntimeConfig } from "./state/types.js";

const buttonStyle: React.CSSProperties = {
  marginRight: "8px",
  marginTop: "8px",
  padding: "8px 16px",
  cursor: "pointer",
};

function WidgetContent() {
  const state = useWidgetState();
  const dispatch = useWidgetDispatch();
  const reset = useWidgetReset();
  const [debugAvatar, setDebugAvatar] = useState(false);

  if (state.phase === "loading") {
    return (
      <output style={{ fontFamily: "sans-serif", padding: "16px", display: "block" }}>
        <p style={{ margin: 0, fontSize: "14px" }}>Loading…</p>
      </output>
    );
  }

  if (state.phase === "avatar_form") {
    return <AvatarForm />;
  }

  if (state.phase === "avatar_view") {
    const measurementsForAvatar =
      state.finalMeasurements ?? state.predictedMeasurements ?? bodyMeasurementsFixture;

    return (
      <div
        style={{
          fontFamily: "sans-serif",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <p style={{ margin: "0 0 12px", fontSize: "14px" }}>Your avatar</p>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          <div style={{ flex: "0 0 360px" }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "3 / 5",
                overflow: "hidden",
              }}
            >
              <AvatarSvg measurements={measurementsForAvatar} debug={debugAvatar} />
            </div>
            <div
              style={{
                fontSize: "12px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={debugAvatar}
                  onChange={(e) => setDebugAvatar(e.target.checked)}
                />
                Debug overlay
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" style={buttonStyle} onClick={() => dispatch({ type: "BACK" })}>
                Back
              </button>
              <button type="button" style={buttonStyle} onClick={() => dispatch({ type: "NEXT" })}>
                Next
              </button>
              <button type="button" style={buttonStyle} onClick={reset}>
                Reset
              </button>
            </div>
          </div>
          <MeasurementOverridesPanel
            predicted={state.predictedMeasurements}
            finals={state.finalMeasurements}
            onChangeZone={(zone, value) =>
              dispatch({
                type: "UPDATE_FINAL_MEASUREMENT_ZONE",
                payload: { zone, value },
              })
            }
            onReset={() => {
              if (state.predictedMeasurements) {
                dispatch({
                  type: "SET_FINAL_MEASUREMENTS",
                  payload: state.predictedMeasurements,
                });
              }
            }}
          />
        </div>
      </div>
    );
  }

  if (state.phase === "tryon_view") {
    return (
      <div style={{ fontFamily: "sans-serif", padding: "16px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "14px" }}>Try-on view (placeholder)</p>
        <button type="button" style={buttonStyle} onClick={() => dispatch({ type: "BACK" })}>
          Back
        </button>
        <button type="button" style={buttonStyle} onClick={() => dispatch({ type: "NEXT" })}>
          Next
        </button>
        <button type="button" style={buttonStyle} onClick={reset}>
          Reset
        </button>
      </div>
    );
  }

  if (state.phase === "heatmap_view") {
    return (
      <div style={{ fontFamily: "sans-serif", padding: "16px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "14px" }}>Heatmap view (placeholder)</p>
        <button type="button" style={buttonStyle} onClick={() => dispatch({ type: "BACK" })}>
          Back
        </button>
        <button type="button" style={buttonStyle} onClick={reset}>
          Reset
        </button>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div style={{ fontFamily: "sans-serif", padding: "16px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "14px" }}>{state.errorMessage ?? "Error"}</p>
        <button type="button" style={buttonStyle} onClick={reset}>
          Retry
        </button>
      </div>
    );
  }

  return null;
}

export function Widget({ config }: { config: RuntimeConfig }) {
  return (
    <WidgetProvider config={config}>
      <WidgetShell />
    </WidgetProvider>
  );
}

function WidgetShell() {
  const reset = useWidgetReset();
  return (
    <ErrorBoundary onReset={reset}>
      <WidgetContent />
    </ErrorBoundary>
  );
}
