import type { WidgetConfig } from "./schemas.js";
import { CANONICAL_ZONES } from "./zones.js";

/**
 * Semver config version surfaced to the widget.
 * Bump when WidgetConfig changes in a breaking way.
 */
export const WIDGET_CONFIG_VERSION = "1.0" as const;

/**
 * Production defaults for the widget config.
 * Safe for public delivery with no per-shop customisation applied.
 *
 * Kept separate from widgetConfigFixture in fixtures.ts so that
 * test expectations and live defaults can diverge independently.
 */
export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  version: WIDGET_CONFIG_VERSION,
  enabledZones: [...CANONICAL_ZONES],
  baseTolerancesCm: {
    shoulders: 1.5,
    bust_chest: 2.0,
    waist: 1.5,
    hips: 2.0,
    thigh: 1.5,
    inseam: 1.0,
    sleeve_length: 1.0,
    torso_length: 1.5,
  },
  fabricMultipliers: {
    STRETCHY: 0.7,
    MODERATE: 1.0,
    STIFF: 1.3,
  },
  branding: {
    poweredBy: true,
    poweredByText: "Powered by Sqairinch",
  },
  uiFlags: {
    enableOverlay: true,
    enableRecommendation: true,
    debug: false,
  },
};
