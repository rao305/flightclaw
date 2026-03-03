import { describe, expect, it } from "vitest";
import { DEFAULT_WIDGET_CONFIG, WIDGET_CONFIG_VERSION } from "../defaults.js";
import { FabricTypeSchema, FitClassSchema, GenderSchema } from "../enums.js";
import {
  bodyInputsFixture,
  bodyMeasurementsFixture,
  eventPayloadFixture,
  fitResultFixture,
  garmentMeasurementsFixture,
  skuResponseBottomFixture,
  skuResponseTopFixture,
  widgetConfigFixture,
} from "../fixtures.js";
import {
  BodyInputsSchema,
  BodyMeasurementsSchema,
  EventPayloadSchema,
  EventTypeSchema,
  FitResultSchema,
  GarmentMeasurementsSchema,
  SkuResponseSchema,
  WidgetConfigSchema,
} from "../schemas.js";
import { ZoneKeySchema } from "../zones.js";

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

describe("ZoneKeySchema", () => {
  it("accepts all 8 canonical zones", () => {
    const zones = [
      "shoulders",
      "bust_chest",
      "waist",
      "hips",
      "thigh",
      "inseam",
      "sleeve_length",
      "torso_length",
    ];
    for (const z of zones) {
      expect(ZoneKeySchema.safeParse(z).success).toBe(true);
    }
  });

  it("rejects unknown zone key", () => {
    expect(ZoneKeySchema.safeParse("neck").success).toBe(false);
  });

  it("rejects wrong casing", () => {
    expect(ZoneKeySchema.safeParse("WAIST").success).toBe(false);
    expect(ZoneKeySchema.safeParse("Shoulders").success).toBe(false);
  });
});

describe("FabricTypeSchema", () => {
  it("accepts valid values", () => {
    expect(FabricTypeSchema.safeParse("STRETCHY").success).toBe(true);
    expect(FabricTypeSchema.safeParse("MODERATE").success).toBe(true);
    expect(FabricTypeSchema.safeParse("STIFF").success).toBe(true);
  });

  it("rejects invalid value", () => {
    expect(FabricTypeSchema.safeParse("stretchy").success).toBe(false);
    expect(FabricTypeSchema.safeParse("RIGID").success).toBe(false);
  });
});

describe("FitClassSchema", () => {
  it("accepts valid values", () => {
    expect(FitClassSchema.safeParse("TIGHT").success).toBe(true);
    expect(FitClassSchema.safeParse("PERFECT").success).toBe(true);
    expect(FitClassSchema.safeParse("LOOSE").success).toBe(true);
    expect(FitClassSchema.safeParse("UNKNOWN").success).toBe(true);
  });

  it("rejects invalid value", () => {
    expect(FitClassSchema.safeParse("tight").success).toBe(false);
  });
});

describe("GenderSchema", () => {
  it("accepts M, F, NB", () => {
    expect(GenderSchema.safeParse("M").success).toBe(true);
    expect(GenderSchema.safeParse("F").success).toBe(true);
    expect(GenderSchema.safeParse("NB").success).toBe(true);
  });

  it("rejects invalid gender", () => {
    expect(GenderSchema.safeParse("male").success).toBe(false);
    expect(GenderSchema.safeParse("X").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BodyInputsSchema
// ---------------------------------------------------------------------------

describe("BodyInputsSchema", () => {
  it("accepts valid fixture", () => {
    expect(BodyInputsSchema.safeParse(bodyInputsFixture).success).toBe(true);
  });

  it("rejects negative height", () => {
    expect(BodyInputsSchema.safeParse({ ...bodyInputsFixture, heightCm: -10 }).success).toBe(false);
  });

  it("rejects height > 300", () => {
    expect(BodyInputsSchema.safeParse({ ...bodyInputsFixture, heightCm: 301 }).success).toBe(false);
  });

  it("rejects age < 10", () => {
    expect(BodyInputsSchema.safeParse({ ...bodyInputsFixture, age: 9 }).success).toBe(false);
  });

  it("rejects non-integer age", () => {
    expect(BodyInputsSchema.safeParse({ ...bodyInputsFixture, age: 25.5 }).success).toBe(false);
  });

  it("rejects invalid gender", () => {
    expect(BodyInputsSchema.safeParse({ ...bodyInputsFixture, gender: "X" }).success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { heightCm: _, ...without } = bodyInputsFixture;
    expect(BodyInputsSchema.safeParse(without).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BodyMeasurementsSchema / GarmentMeasurementsSchema
// ---------------------------------------------------------------------------

describe("BodyMeasurementsSchema", () => {
  it("accepts valid fixture", () => {
    expect(BodyMeasurementsSchema.safeParse(bodyMeasurementsFixture).success).toBe(true);
  });

  it("accepts partial map (subset of zones)", () => {
    expect(BodyMeasurementsSchema.safeParse({ waist: 78.0, hips: 98.0 }).success).toBe(true);
  });

  it("accepts empty record", () => {
    expect(BodyMeasurementsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects zero value", () => {
    expect(BodyMeasurementsSchema.safeParse({ waist: 0 }).success).toBe(false);
  });

  it("rejects negative value", () => {
    expect(BodyMeasurementsSchema.safeParse({ waist: -5 }).success).toBe(false);
  });

  it("rejects unknown zone key", () => {
    expect(BodyMeasurementsSchema.safeParse({ neck: 36.0 }).success).toBe(false);
  });
});

describe("GarmentMeasurementsSchema", () => {
  it("accepts valid fixture", () => {
    expect(GarmentMeasurementsSchema.safeParse(garmentMeasurementsFixture).success).toBe(true);
  });

  it("accepts partial map", () => {
    expect(GarmentMeasurementsSchema.safeParse({ waist: 76.0 }).success).toBe(true);
  });

  it("accepts empty record", () => {
    expect(GarmentMeasurementsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects zero value", () => {
    expect(GarmentMeasurementsSchema.safeParse({ waist: 0 }).success).toBe(false);
  });

  it("rejects unknown zone key", () => {
    expect(GarmentMeasurementsSchema.safeParse({ chest: 90 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WidgetConfigSchema
// ---------------------------------------------------------------------------

describe("WidgetConfigSchema", () => {
  it("accepts valid fixture", () => {
    expect(WidgetConfigSchema.safeParse(widgetConfigFixture).success).toBe(true);
  });

  it("rejects empty enabledZones array", () => {
    expect(
      WidgetConfigSchema.safeParse({
        ...widgetConfigFixture,
        enabledZones: [],
      }).success
    ).toBe(false);
  });

  it("rejects invalid zone key in enabledZones", () => {
    expect(
      WidgetConfigSchema.safeParse({
        ...widgetConfigFixture,
        enabledZones: ["waist", "INVALID_ZONE"],
      }).success
    ).toBe(false);
  });

  it("rejects negative fabricMultiplier", () => {
    expect(
      WidgetConfigSchema.safeParse({
        ...widgetConfigFixture,
        fabricMultipliers: { STRETCHY: -0.7, MODERATE: 1.0, STIFF: 1.3 },
      }).success
    ).toBe(false);
  });

  it("rejects missing version", () => {
    const { version: _, ...without } = widgetConfigFixture;
    expect(WidgetConfigSchema.safeParse(without).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SkuResponseSchema
// ---------------------------------------------------------------------------

describe("SkuResponseSchema", () => {
  it("accepts bottom fixture", () => {
    expect(SkuResponseSchema.safeParse(skuResponseBottomFixture).success).toBe(true);
  });

  it("accepts top fixture", () => {
    expect(SkuResponseSchema.safeParse(skuResponseTopFixture).success).toBe(true);
  });

  it("accepts missing imageUrl (optional)", () => {
    const { imageUrl: _, ...without } = skuResponseBottomFixture;
    expect(SkuResponseSchema.safeParse(without).success).toBe(true);
  });

  it('rejects unit "in"', () => {
    expect(SkuResponseSchema.safeParse({ ...skuResponseBottomFixture, unit: "in" }).success).toBe(
      false
    );
  });

  it("rejects invalid datetime", () => {
    expect(
      SkuResponseSchema.safeParse({
        ...skuResponseBottomFixture,
        updatedAt: "not-a-date",
      }).success
    ).toBe(false);
  });

  it("rejects invalid imageUrl format", () => {
    expect(
      SkuResponseSchema.safeParse({
        ...skuResponseBottomFixture,
        imageUrl: "not-a-url",
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EventTypeSchema
// ---------------------------------------------------------------------------

describe("EventTypeSchema", () => {
  it("accepts all 6 canonical event types", () => {
    const types = [
      "widget_open",
      "avatar_created",
      "avatar_override",
      "tryon_requested",
      "fit_result_shown",
      "error",
    ];
    for (const t of types) {
      expect(EventTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it("rejects unknown event type", () => {
    expect(EventTypeSchema.safeParse("click").success).toBe(false);
    expect(EventTypeSchema.safeParse("pageview").success).toBe(false);
  });

  it("rejects wrong casing", () => {
    expect(EventTypeSchema.safeParse("Widget_Open").success).toBe(false);
    expect(EventTypeSchema.safeParse("ERROR").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(EventTypeSchema.safeParse("").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EventPayloadSchema
// ---------------------------------------------------------------------------

describe("EventPayloadSchema", () => {
  it("accepts valid fixture", () => {
    expect(EventPayloadSchema.safeParse(eventPayloadFixture).success).toBe(true);
  });

  it("accepts missing variantId (optional)", () => {
    const { variantId: _, ...without } = eventPayloadFixture;
    expect(EventPayloadSchema.safeParse(without).success).toBe(true);
  });

  it("rejects empty sessionId", () => {
    expect(
      EventPayloadSchema.safeParse({
        ...eventPayloadFixture,
        sessionId: "",
      }).success
    ).toBe(false);
  });

  it("rejects non-datetime timestamp", () => {
    expect(
      EventPayloadSchema.safeParse({
        ...eventPayloadFixture,
        timestamp: "yesterday",
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_WIDGET_CONFIG
// ---------------------------------------------------------------------------

describe("DEFAULT_WIDGET_CONFIG", () => {
  it("satisfies WidgetConfigSchema", () => {
    expect(WidgetConfigSchema.safeParse(DEFAULT_WIDGET_CONFIG).success).toBe(true);
  });

  it("has correct version constant", () => {
    expect(DEFAULT_WIDGET_CONFIG.version).toBe(WIDGET_CONFIG_VERSION);
  });

  it("enables all 8 canonical zones", () => {
    expect(DEFAULT_WIDGET_CONFIG.enabledZones).toHaveLength(8);
  });

  it("has poweredBy: true in branding", () => {
    expect(DEFAULT_WIDGET_CONFIG.branding.poweredBy).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FitResultSchema
// ---------------------------------------------------------------------------

describe("FitResultSchema", () => {
  it("accepts valid fixture", () => {
    expect(FitResultSchema.safeParse(fitResultFixture).success).toBe(true);
  });

  it("accepts missing recommendation (optional)", () => {
    const { recommendation: _, ...without } = fitResultFixture;
    expect(FitResultSchema.safeParse(without).success).toBe(true);
  });

  it("rejects severity > 1", () => {
    expect(
      FitResultSchema.safeParse({
        ...fitResultFixture,
        zones: [{ ...fitResultFixture.zones[0], severity: 1.5 }],
      }).success
    ).toBe(false);
  });

  it("rejects negative tolCm", () => {
    expect(
      FitResultSchema.safeParse({
        ...fitResultFixture,
        zones: [{ ...fitResultFixture.zones[0], tolCm: -1 }],
      }).success
    ).toBe(false);
  });

  it("rejects invalid zone in summary", () => {
    expect(
      FitResultSchema.safeParse({
        ...fitResultFixture,
        summary: {
          ...fitResultFixture.summary,
          looseZones: ["INVALID_ZONE"],
        },
      }).success
    ).toBe(false);
  });
});
