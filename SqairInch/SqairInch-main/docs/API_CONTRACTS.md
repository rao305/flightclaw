# Sqairinch VTON — V0.1 API Contracts (Strict)
**Status:** V0.1 schema contract  
**Rule:** Storefront widget relies on these schemas. Breaking changes require updating:
- `packages/shared`
- this file
- widget + backend simultaneously

---

## 1) Canonical Zones (V0.1)
Zones must use these exact keys:

- shoulders
- bust_chest
- waist
- hips
- thigh
- inseam
- sleeve_length (tops only)
- torso_length (tops only)

A garment may omit irrelevant fields. Widget must degrade gracefully.

---

## 2) Enums

### 2.1 FabricType
- `STRETCHY`
- `MODERATE`
- `STIFF`

### 2.2 FitClass
- `TIGHT`
- `PERFECT`
- `LOOSE`
- `UNKNOWN` (optional but recommended for missing data cases)

---

## 3) Endpoint: GET /apps/sqairinch/config

### 3.1 Request
Query params:
- `product` (optional) Shopify product id
- `variant` (optional) Shopify variant id

### 3.2 Response: WidgetConfig
Example:

```json
{
  "version": "0.1.0",
  "enabledZones": [
    "shoulders",
    "bust_chest",
    "waist",
    "hips",
    "thigh",
    "inseam",
    "sleeve_length",
    "torso_length"
  ],
  "baseTolerancesCm": {
    "shoulders": 1.0,
    "bust_chest": 2.0,
    "waist": 2.0,
    "hips": 2.0,
    "thigh": 2.0,
    "inseam": 1.5,
    "sleeve_length": 1.5,
    "torso_length": 1.5
  },
  "fabricMultipliers": {
    "STRETCHY": 1.7,
    "MODERATE": 1.0,
    "STIFF": 0.8
  },
  "branding": {
    "poweredBy": true,
    "poweredByText": "Powered by Sqairinch"
  },
  "uiFlags": {
    "enableOverlay": true,
    "enableRecommendation": true,
    "debug": false
  }
}
```

### 3.3 Error responses

* 200 always preferred with safe defaults
* If fatal config error:

  * `500` with:

```json
{ "error": { "code": "CONFIG_ERROR", "message": "..." } }
```

---

## 4) Endpoint: GET /apps/sqairinch/sku?variant={shopify_variant_id}

### 4.1 Request

Query params:

* `variant` (required) Shopify variant id

### 4.2 Response: SkuResponse

Example:

```json
{
  "variantId": "43891234567890",
  "sizeLabel": "M",
  "category": "bottom",
  "fabricType": "MODERATE",
  "unit": "cm",
  "imageUrl": "https://cdn.example.com/garments/variant-4389.png",
  "measurementsCm": {
    "waist": 76.0,
    "hips": 98.0,
    "thigh": 58.0,
    "inseam": 78.0
  },
  "updatedAt": "2026-02-12T00:00:00Z"
}
```

Top example:

```json
{
  "variantId": "43891234567891",
  "sizeLabel": "L",
  "category": "top",
  "fabricType": "STRETCHY",
  "unit": "cm",
  "imageUrl": "https://cdn.example.com/garments/variant-4390.png",
  "measurementsCm": {
    "shoulders": 44.0,
    "bust_chest": 104.0,
    "torso_length": 62.0,
    "sleeve_length": 62.0
  },
  "updatedAt": "2026-02-12T00:00:00Z"
}
```

### 4.3 Error responses

If variant not found:

* `404`

```json
{
  "error": {
    "code": "SKU_NOT_FOUND",
    "message": "No garment measurements found for this variant.",
    "variantId": "43891234567890"
  }
}
```

If request is invalid:

* `400`

```json
{
  "error": { "code": "BAD_REQUEST", "message": "Missing variant param." }
}
```

---

## 5) Endpoint: POST /apps/sqairinch/event

### 5.1 Request: EventPayload

Rules:

* No PII
* include `sessionId`
* include `variantId` when relevant
* include `timestamp` (ISO)
* include `payload` object

Example:

```json
{
  "type": "tryon_fit_result",
  "sessionId": "sess_abc123",
  "variantId": "43891234567890",
  "timestamp": "2026-02-12T00:00:00Z",
  "payload": {
    "avatar": {
      "inputs": { "heightCm": 175, "weightKg": 72, "age": 22, "gender": "M", "bodyShape": "rectangle" },
      "finalMeasurementsCm": { "waist": 80, "hips": 96, "inseam": 80 }
    },
    "fitResult": {
      "zones": [
        { "zone": "waist", "diffCm": -3.0, "tolCm": 2.0, "classification": "TIGHT", "severity": 0.75 },
        { "zone": "hips", "diffCm": 2.0, "tolCm": 2.0, "classification": "PERFECT", "severity": 0.0 }
      ],
      "summary": {
        "tightZones": ["waist"],
        "looseZones": [],
        "perfectZones": ["hips"]
      }
    }
  }
}
```

### 5.2 Response

* `200 { "ok": true }`

### 5.3 Error responses

* `400` invalid schema
* `401` invalid proxy signature (if enforced)
* `500` server error

---

## 6) FitResult Contract (Widget-internal but logged)

FitResult must include:

* per-zone: diffCm, tolCm, classification, severity
* summary: tight/loose/perfect lists
* optional recommendation text

Example (widget internal shape):

```json
{
  "zones": [
    { "zone": "waist", "diffCm": -2.5, "tolCm": 2.0, "classification": "TIGHT", "severity": 0.6 }
  ],
  "summary": {
    "tightZones": ["waist"],
    "looseZones": [],
    "perfectZones": []
  },
  "recommendation": "Waist looks tight by ~2.5 cm — consider sizing up."
}
```

---

## 7) Schema Stability Rules

* Zone keys cannot change in V0.1.
* Endpoint paths cannot change in V0.1.
* Adding optional fields is allowed.
* Removing or renaming fields is a breaking change.

---

