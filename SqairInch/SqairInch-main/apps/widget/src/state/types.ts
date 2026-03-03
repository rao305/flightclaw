import type { BodyInputs, BodyMeasurements, WidgetConfig, ZoneKey } from "@sqairinch/shared";

/** Runtime mount options passed from the host page. */
export interface RuntimeConfig {
  baseUrl: string;
  queryString: string;
  variantId?: string;
}

/** Widget flow phases (state machine states). */
export type WidgetPhase =
  | "loading"
  | "avatar_form"
  | "avatar_view"
  | "tryon_view"
  | "heatmap_view"
  | "error";

/** Typed actions for explicit transitions. */
export type WidgetAction =
  | { type: "CONFIG_LOADED" }
  | { type: "WIDGET_CONFIG_LOADED"; payload: WidgetConfig }
  | { type: "SUBMIT_AVATAR"; payload: BodyInputs }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "RESET"; payload?: { newSessionId: string } }
  | { type: "ERROR"; payload: string }
  | { type: "SET_PREDICTED_MEASUREMENTS"; payload: BodyMeasurements }
  | { type: "SET_FINAL_MEASUREMENTS"; payload: BodyMeasurements | null }
  | {
      type: "UPDATE_FINAL_MEASUREMENT_ZONE";
      payload: { zone: ZoneKey; value: number };
    }
  | {
      type: "LOAD_PERSISTED_FINAL_MEASUREMENTS";
      payload: BodyMeasurements;
    };

/** Full state held in context (reducer state). */
export interface WidgetStateContextValue {
  phase: WidgetPhase;
  errorMessage: string | null;
  avatarInputs: BodyInputs | null;
  sessionId: string;
  predictedMeasurements: BodyMeasurements | null;
  finalMeasurements: BodyMeasurements | null;
  widgetConfig: WidgetConfig | null;
}
