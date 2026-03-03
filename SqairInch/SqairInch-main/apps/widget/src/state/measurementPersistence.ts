import type { BodyMeasurements } from "@sqairinch/shared";

const MEASUREMENT_OVERRIDES_PREFIX = "sqairinch_measurement_overrides_";

function getOverridesStorageKey(sessionId: string): string {
  return `${MEASUREMENT_OVERRIDES_PREFIX}${sessionId}`;
}

export function loadFinalMeasurements(sessionId: string): BodyMeasurements | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(getOverridesStorageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BodyMeasurements;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveFinalMeasurements(sessionId: string, finals: BodyMeasurements | null): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  const key = getOverridesStorageKey(sessionId);
  try {
    if (!finals) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(finals));
  } catch {
    // Best-effort only; ignore persistence errors in the widget.
  }
}
