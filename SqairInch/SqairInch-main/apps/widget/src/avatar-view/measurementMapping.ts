import type { BodyMeasurements } from "@sqairinch/shared";
import { bodyMeasurementsFixture } from "@sqairinch/shared";

type ZoneKey = "shoulders" | "bust_chest" | "waist" | "hips";

interface ZoneScaleConfig {
  baseline: number;
  k: number;
  minScale: number;
  maxScale: number;
}

export interface ZoneScales {
  shoulders: number;
  bust: number;
  waist: number;
  hips: number;
}

const baseline: Record<ZoneKey, number> = {
  shoulders: bodyMeasurementsFixture.shoulders ?? 44,
  bust_chest: bodyMeasurementsFixture.bust_chest ?? 94,
  waist: bodyMeasurementsFixture.waist ?? 78,
  hips: bodyMeasurementsFixture.hips ?? 98,
};

const CONFIG: Record<ZoneKey, ZoneScaleConfig> = {
  shoulders: {
    baseline: baseline.shoulders,
    k: 0.8,
    minScale: 0.7,
    maxScale: 1.3,
  },
  bust_chest: {
    baseline: baseline.bust_chest,
    k: 1.0,
    minScale: 0.7,
    maxScale: 1.4,
  },
  waist: {
    baseline: baseline.waist,
    k: 1.2,
    minScale: 0.6,
    maxScale: 1.5,
  },
  hips: {
    baseline: baseline.hips,
    k: 1.0,
    minScale: 0.7,
    maxScale: 1.4,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scaleForZone(config: ZoneScaleConfig, cm: number | undefined): number {
  const value = cm ?? config.baseline;
  if (!(value > 0)) return 1;
  const delta = (value - config.baseline) / config.baseline;
  const raw = 1 + config.k * delta;
  return clamp(raw, config.minScale, config.maxScale);
}

/** Deterministic mapping from BodyMeasurements (cm) to normalized width scales. */
export function getZoneScales(measurements: BodyMeasurements): ZoneScales {
  return {
    shoulders: scaleForZone(CONFIG.shoulders, measurements.shoulders),
    bust: scaleForZone(CONFIG.bust_chest, measurements.bust_chest),
    waist: scaleForZone(CONFIG.waist, measurements.waist),
    hips: scaleForZone(CONFIG.hips, measurements.hips),
  };
}
