import type { WidgetAction, WidgetStateContextValue } from "./types.js";

export function widgetReducer(
  state: WidgetStateContextValue,
  action: WidgetAction
): WidgetStateContextValue {
  switch (action.type) {
    case "CONFIG_LOADED":
      if (state.phase !== "loading") return state;
      return { ...state, phase: "avatar_form" };

    case "WIDGET_CONFIG_LOADED":
      if (state.phase !== "loading") return state;
      return { ...state, phase: "avatar_form", widgetConfig: action.payload };

    case "SUBMIT_AVATAR":
      if (state.phase !== "avatar_form") return state;
      return {
        ...state,
        phase: "avatar_view",
        avatarInputs: action.payload,
      };

    case "NEXT":
      if (state.phase === "avatar_view") {
        return { ...state, phase: "tryon_view" };
      }
      if (state.phase === "tryon_view") {
        return { ...state, phase: "heatmap_view" };
      }
      return state;

    case "BACK":
      if (state.phase === "heatmap_view") {
        return { ...state, phase: "tryon_view" };
      }
      if (state.phase === "tryon_view") {
        return { ...state, phase: "avatar_view" };
      }
      if (state.phase === "avatar_view") {
        return { ...state, phase: "avatar_form" };
      }
      return state;

    case "RESET": {
      const newSessionId = action.payload?.newSessionId ?? state.sessionId;
      return {
        phase: "loading",
        errorMessage: null,
        avatarInputs: null,
        sessionId: newSessionId,
        predictedMeasurements: null,
        finalMeasurements: null,
        widgetConfig: null,
      };
    }

    case "ERROR":
      return {
        ...state,
        phase: "error",
        errorMessage: action.payload,
      };

    case "SET_PREDICTED_MEASUREMENTS":
      return {
        ...state,
        predictedMeasurements: action.payload,
      };

    case "SET_FINAL_MEASUREMENTS":
      return {
        ...state,
        finalMeasurements: action.payload,
      };

    case "UPDATE_FINAL_MEASUREMENT_ZONE": {
      const base = state.finalMeasurements ?? state.predictedMeasurements ?? null;
      if (!base) return state;
      return {
        ...state,
        finalMeasurements: {
          ...base,
          [action.payload.zone]: action.payload.value,
        },
      };
    }

    case "LOAD_PERSISTED_FINAL_MEASUREMENTS":
      return {
        ...state,
        finalMeasurements: action.payload,
      };

    default:
      return state;
  }
}
