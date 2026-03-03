# CSV Template — Garment Measurements Import

This document describes the official CSV format for bulk-importing garment variant measurements via the two-step admin API: `POST /api/admin/csv-import/preview` → `POST /api/admin/csv-import/confirm`.

A downloadable starter template is available at:
`/templates/measurements-template.csv` (served from the Shopify app's public directory)

---

## Headers (in order)

```
shopify_variant_id,shopify_product_id,size_label,category,fabric_type,waist_cm,hips_cm,bust_chest_cm,torso_length_cm,inseam_cm,sleeve_length_cm,image_url
```

`image_url` is optional. All other columns must be present in the header even if left empty for a given row.

---

## Column Definitions

| Column | Required | Type | Validation |
|---|---|---|---|
| `shopify_variant_id` | Always | string | Non-empty. Accepts numeric IDs (auto-normalized to GID format) or full GID strings. |
| `shopify_product_id` | Always | string | Non-empty. Used to associate the variant with the correct product record. |
| `size_label` | Always | string | Non-empty. E.g. `XS`, `S`, `M`, `L`, `XL`. |
| `category` | Always | enum | `top` or `bottom` |
| `fabric_type` | Always | enum | `STRETCHY`, `MODERATE`, or `STIFF` |
| `waist_cm` | Always | number | 10–250 cm |
| `hips_cm` | Always | number | 10–250 cm |
| `bust_chest_cm` | **Tops only** | number | 10–250 cm |
| `torso_length_cm` | **Tops only** | number | 10–150 cm |
| `inseam_cm` | **Bottoms only** | number | 10–130 cm |
| `sleeve_length_cm` | Optional | number | 10–130 cm |
| `image_url` | Optional | string (URL) | Must be a valid URL if provided |

### Category-dependent requirements

- `category=top` → `bust_chest_cm` and `torso_length_cm` are **required**
- `category=bottom` → `inseam_cm` is **required**
- Leave non-applicable columns empty (not omitted — the column must still be present in the header)

---

## Internal Column Mapping

`_cm`-suffixed CSV columns map to internal measurement zone keys as follows:

| CSV column | Internal zone key |
|---|---|
| `waist_cm` | `waist` |
| `hips_cm` | `hips` |
| `bust_chest_cm` | `bust_chest` |
| `torso_length_cm` | `torso_length` |
| `inseam_cm` | `inseam` |
| `sleeve_length_cm` | `sleeve_length` |

---

## Example CSV

```csv
shopify_variant_id,shopify_product_id,size_label,category,fabric_type,waist_cm,hips_cm,bust_chest_cm,torso_length_cm,inseam_cm,sleeve_length_cm,image_url
9000000001,8000000001,M,top,STRETCHY,76,92,88,60,,62,https://cdn.example.com/shirt-m.jpg
9000000002,8000000002,32,bottom,MODERATE,82,98,,,76,,
```

- Row 1: a `top` with `bust_chest_cm`, `torso_length_cm`, optional `sleeve_length_cm`, and an `image_url`; `inseam_cm` is left empty
- Row 2: a `bottom` with `inseam_cm`; top-specific columns and `image_url` are left empty

---

## API Usage

**Step 1 — Preview**

```bash
# Returns job_id and validation report. Nothing is written to measurements tables yet.
curl -X POST \
  "https://<your-app-domain>/api/admin/csv-import/preview?shop=your-store.myshopify.com" \
  -F "file=@measurements.csv"
```

**Step 2 — Confirm**

```bash
# Applies all valid rows atomically. Use the job_id returned by preview.
curl -X POST \
  "https://<your-app-domain>/api/admin/csv-import/confirm?shop=your-store.myshopify.com" \
  -H "Content-Type: application/json" \
  -d '{"job_id":"<uuid from preview>"}'
```

Preview jobs expire after **15 minutes**. Re-upload the CSV to get a new `job_id` if needed.

---

## Preview Response

```json
{
  "ok": true,
  "job_id": "b3f1c2d4-...",
  "expires_at": "2026-02-12T10:15:00Z",
  "summary": { "total": 3, "rows_ok": 2, "rows_failed": 1 },
  "error_details": [
    {
      "row": 3,
      "shopify_variant_id": "9000000003",
      "errors": [
        { "field": "bust_chest_cm", "message": "Required for category 'top'", "received": "" },
        { "field": "torso_length_cm", "message": "Required for category 'top'", "received": "" }
      ]
    }
  ]
}
```

`error_details` is only present when `rows_failed > 0`.

## Confirm Response

```json
{ "ok": true, "job_id": "b3f1c2d4-...", "applied": 2 }
```

## Confirm Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 404 | `{ "error": "Job not found" }` | Unknown `job_id` or wrong shop |
| 409 | `{ "error": "Job already applied / expired" }` | Double-confirm or expired job |
| 400 | `{ "error": "No valid rows to apply" }` | All rows failed validation |
| 500 | `{ "error": "<rpc error message>" }` | Transactional failure (all rows rolled back) |
```

### Error detail schema

```typescript
interface CsvFieldError {
  field: string        // Column name, e.g. "bust_chest_cm"
  message: string      // Human-readable description
  received?: unknown   // Actual value that failed validation
}

interface CsvRowError {
  row: number                  // 1-indexed (row 2 = first data row)
  shopify_variant_id?: string  // Included when available for traceability
  errors: CsvFieldError[]
}
```

---

## Notes for Merchants

- All 11 measurement columns **must be present** in the header row, even if some are left empty for a given row. `image_url` is optional but must be a valid URL if provided.
- Numeric variant IDs (e.g. `9000000001`) are automatically normalized to Shopify GID format.
- `shopify_product_id` is required operationally — it links the variant to the correct product in the database even if not always visible in Shopify's UI.
- Measurements are in **centimetres (cm)**.
- Upload the file using `multipart/form-data` with the field name `file`, or send the raw CSV body as `text/plain` (max **5 MB**).
- The preview → confirm flow is **all-or-nothing**: if any error occurs during confirm, no rows are committed and you can fix the CSV and re-upload.
