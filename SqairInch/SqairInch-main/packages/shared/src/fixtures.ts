import type {
  BodyInputs,
  BodyMeasurements,
  EventPayload,
  FitResult,
  GarmentMeasurements,
  SkuResponse,
  WidgetConfig,
} from "./schemas.js";

export const widgetConfigFixture: WidgetConfig = {
  version: "0.1",
  enabledZones: [
    "shoulders",
    "bust_chest",
    "waist",
    "hips",
    "thigh",
    "inseam",
    "sleeve_length",
    "torso_length",
  ],
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

export const skuResponseBottomFixture: SkuResponse = {
  variantId: "sku-bottom-001",
  sizeLabel: "M",
  category: "bottom",
  fabricType: "MODERATE",
  unit: "cm",
  imageUrl: "https://example.com/images/sku-bottom-001.jpg",
  measurementsCm: {
    waist: 76.0,
    hips: 96.0,
    thigh: 56.0,
    inseam: 76.0,
  },
  updatedAt: "2024-01-15T10:00:00.000Z",
};

export const skuResponseTopFixture: SkuResponse = {
  variantId: "sku-top-001",
  sizeLabel: "M",
  category: "top",
  fabricType: "STRETCHY",
  unit: "cm",
  imageUrl: "https://example.com/images/sku-top-001.jpg",
  measurementsCm: {
    shoulders: 42.0,
    bust_chest: 92.0,
    waist: 74.0,
    sleeve_length: 62.0,
    torso_length: 66.0,
  },
  updatedAt: "2024-01-15T10:00:00.000Z",
};

export const eventPayloadFixture: EventPayload = {
  type: "tryon_fit_result",
  sessionId: "session-abc-123",
  variantId: "sku-top-001",
  timestamp: "2024-01-15T10:05:00.000Z",
  payload: {
    fitScore: 0.82,
    zones: ["bust_chest", "waist"],
    recommendation: "Size up for a more comfortable fit",
  },
};

export const bodyInputsFixture: BodyInputs = {
  heightCm: 175,
  weightKg: 72,
  age: 28,
  gender: "M",
  bodyShape: "rectangle",
};

export const bodyMeasurementsFixture: BodyMeasurements = {
  shoulders: 44.0,
  bust_chest: 94.0,
  waist: 78.0,
  hips: 98.0,
  thigh: 58.0,
  inseam: 78.0,
};

export const garmentMeasurementsFixture: GarmentMeasurements = {
  waist: 76.0,
  hips: 96.0,
  thigh: 56.0,
  inseam: 76.0,
};

export const fitResultFixture: FitResult = {
  zones: [
    {
      zone: "waist",
      diffCm: 2.0,
      tolCm: 1.5,
      classification: "LOOSE",
      severity: 0.4,
    },
  ],
  summary: {
    tightZones: [],
    looseZones: ["waist"],
    perfectZones: [],
  },
  recommendation: "Consider sizing down for a better waist fit",
};
