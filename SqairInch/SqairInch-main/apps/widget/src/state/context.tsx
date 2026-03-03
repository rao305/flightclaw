import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { fetchConfig, logEvent } from "../api.js";
import { createNewSessionId, getOrCreateSessionId } from "./constants.js";
import { loadFinalMeasurements, saveFinalMeasurements } from "./measurementPersistence.js";
import { widgetReducer } from "./reducer.js";
import type { RuntimeConfig, WidgetAction, WidgetStateContextValue } from "./types.js";

const initialState: WidgetStateContextValue = {
  phase: "loading",
  errorMessage: null,
  avatarInputs: null,
  sessionId: getOrCreateSessionId(),
  predictedMeasurements: null,
  finalMeasurements: null,
  widgetConfig: null,
};

type WidgetDispatch = (action: WidgetAction) => void;

interface WidgetContextValue {
  state: WidgetStateContextValue;
  dispatch: WidgetDispatch;
}

const WidgetContext = createContext<WidgetContextValue | null>(null);

interface WidgetProviderProps {
  children: ReactNode;
  config: RuntimeConfig;
}

export function WidgetProvider({ children, config }: WidgetProviderProps) {
  const [state, dispatch] = useReducer(widgetReducer, initialState);
  // config is stable (mount-time options); store in ref so effects
  // that only need to read it don't cause spurious re-runs.
  const configRef = useRef(config);

  const { sessionId, finalMeasurements } = state;

  // Fetch config when in loading phase.
  useEffect(() => {
    if (state.phase !== "loading") return;
    let cancelled = false;
    fetchConfig(config.baseUrl, config.queryString)
      .then((widgetConfig) => {
        if (!cancelled) dispatch({ type: "WIDGET_CONFIG_LOADED", payload: widgetConfig });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load configuration";
          dispatch({ type: "ERROR", payload: message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.phase, config.baseUrl, config.queryString]);

  // Hydrate final measurements from localStorage once per session id.
  useEffect(() => {
    const loaded = loadFinalMeasurements(sessionId);
    if (loaded) {
      dispatch({ type: "LOAD_PERSISTED_FINAL_MEASUREMENTS", payload: loaded });
    }
  }, [sessionId]);

  // Persist final measurements whenever they change.
  useEffect(() => {
    saveFinalMeasurements(sessionId, finalMeasurements);
  }, [sessionId, finalMeasurements]);

  // Fire widget_open once on mount (config is stable; read from ref).
  useEffect(() => {
    void logEvent(configRef.current.baseUrl, configRef.current.queryString, {
      type: "widget_open",
      sessionId: initialState.sessionId,
      timestamp: new Date().toISOString(),
      payload: {},
    });
  }, []);

  // Track avatar submissions to distinguish avatar_created vs avatar_override.
  const hasSubmittedAvatarRef = useRef(false);

  // Fire phase-transition events.
  useEffect(() => {
    if (state.phase === "avatar_view") {
      const { baseUrl, queryString } = configRef.current;
      const eventType = hasSubmittedAvatarRef.current ? "avatar_override" : "avatar_created";
      hasSubmittedAvatarRef.current = true;
      void logEvent(baseUrl, queryString, {
        type: eventType,
        sessionId: state.sessionId,
        timestamp: new Date().toISOString(),
        payload: {},
      });
      void logEvent(baseUrl, queryString, {
        type: "tryon_requested",
        sessionId: state.sessionId,
        variantId: undefined,
        timestamp: new Date().toISOString(),
        payload: {},
      });
    }
  }, [state.phase, state.sessionId]);

  const value = useMemo<WidgetContextValue>(() => ({ state, dispatch }), [state]);

  return <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>;
}

export function useWidgetState(): WidgetStateContextValue {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error("useWidgetState must be used within WidgetProvider");
  return ctx.state;
}

export function useWidgetDispatch(): WidgetDispatch {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error("useWidgetDispatch must be used within WidgetProvider");
  return ctx.dispatch;
}

/** Dispatches RESET with a new session id and persists it. */
export function useWidgetReset(): () => void {
  const dispatch = useWidgetDispatch();
  return useCallback(() => {
    const newSessionId = createNewSessionId();
    dispatch({ type: "RESET", payload: { newSessionId } });
  }, [dispatch]);
}
