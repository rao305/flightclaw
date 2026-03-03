import { FabricTypeSchema, GarmentCategorySchema } from "@sqairinch/shared";
import { z } from "zod";

// ── Column → internal zone key mapping ──────────────────────────────────────

export const CSV_TO_ZONE_MAP: Record<string, string> = {
  waist_cm: "waist",
  hips_cm: "hips",
  bust_chest_cm: "bust_chest",
  torso_length_cm: "torso_length",
  inseam_cm: "inseam",
  sleeve_length_cm: "sleeve_length",
};

// ── Error types ──────────────────────────────────────────────────────────────

export interface CsvFieldError {
  field: string;
  message: string;
  received?: unknown;
}

export interface CsvRowError {
  row: number;
  shopify_variant_id?: string;
  errors: CsvFieldError[];
}

// ── Validated row type ───────────────────────────────────────────────────────

export interface CsvRowValidated {
  shopify_variant_id: string;
  shopify_product_id: string;
  size_label: string;
  category: "top" | "bottom";
  fabric_type: "STRETCHY" | "MODERATE" | "STIFF";
  waist_cm: number;
  hips_cm: number;
  bust_chest_cm?: number;
  torso_length_cm?: number;
  inseam_cm?: number;
  sleeve_length_cm?: number;
  image_url?: string;
}

export type CsvValidationResult = {
  valid: CsvRowValidated[];
  errors: CsvRowError[];
};

// ── Zod schemas ──────────────────────────────────────────────────────────────

const BaseRowSchema = z.object({
  shopify_variant_id: z.string().min(1, "Required"),
  shopify_product_id: z.string().min(1, "Required"),
  size_label: z.string().min(1, "Required"),
  category: z.enum(["top", "bottom"], {
    errorMap: () => ({ message: "Must be 'top' or 'bottom'" }),
  }),
  fabric_type: FabricTypeSchema,
  waist_cm: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(10, "Must be between 10 and 250 cm")
    .max(250, "Must be between 10 and 250 cm"),
  hips_cm: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(10, "Must be between 10 and 250 cm")
    .max(250, "Must be between 10 and 250 cm"),
});

const FullRowSchema = BaseRowSchema.extend({
  bust_chest_cm: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(10, "Must be between 10 and 250 cm")
    .max(250, "Must be between 10 and 250 cm")
    .optional(),
  torso_length_cm: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(10, "Must be between 10 and 150 cm")
    .max(150, "Must be between 10 and 150 cm")
    .optional(),
  inseam_cm: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(10, "Must be between 10 and 130 cm")
    .max(130, "Must be between 10 and 130 cm")
    .optional(),
  sleeve_length_cm: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(10, "Must be between 10 and 130 cm")
    .max(130, "Must be between 10 and 130 cm")
    .optional(),
  image_url: z.string().url("Must be a valid URL").optional(),
}).superRefine((data, ctx) => {
  if (data.category === "top") {
    if (!data.bust_chest_cm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bust_chest_cm"],
        message: "Required for category 'top'",
      });
    }
    if (!data.torso_length_cm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["torso_length_cm"],
        message: "Required for category 'top'",
      });
    }
  }
  if (data.category === "bottom") {
    if (!data.inseam_cm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inseam_cm"],
        message: "Required for category 'bottom'",
      });
    }
  }
});

// ── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse CSV text into headers + rows. Handles quoted fields with embedded commas.
 */
export function parseCsvText(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseFields = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseFields(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseFields(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

// ── Validator ────────────────────────────────────────────────────────────────

/**
 * Validate all parsed CSV rows. Returns validated rows and structured row errors.
 * @param rows - parsed rows from parseCsvText
 * @param startRowNumber - 1-indexed row number of the first data row (default 2, accounting for header)
 */
export function validateCsvRows(
  rows: Record<string, string>[],
  startRowNumber = 2
): CsvValidationResult {
  const valid: CsvRowValidated[] = [];
  const errors: CsvRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = startRowNumber + i;
    const variantId = rawRow.shopify_variant_id || undefined;

    // Treat empty strings as undefined for optional numeric fields
    const normalized: Record<string, unknown> = { ...rawRow };
    for (const col of [
      "bust_chest_cm",
      "torso_length_cm",
      "inseam_cm",
      "sleeve_length_cm",
      "image_url",
    ]) {
      if (normalized[col] === "") {
        normalized[col] = undefined;
      }
    }

    const result = FullRowSchema.safeParse(normalized);

    if (!result.success) {
      const fieldErrors: CsvFieldError[] = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "unknown",
        message: issue.message,
        received: rawRow[issue.path[0] as string],
      }));

      errors.push({
        row: rowNumber,
        ...(variantId ? { shopify_variant_id: variantId } : {}),
        errors: fieldErrors,
      });
    } else {
      valid.push(result.data as CsvRowValidated);
    }
  }

  return { valid, errors };
}

// ── Measurement builder ──────────────────────────────────────────────────────

/**
 * Map _cm columns from a validated row to internal zone key record.
 */
export function buildMeasurementsCm(row: CsvRowValidated): Record<string, number> {
  const measurements: Record<string, number> = {};
  for (const [csvCol, zoneKey] of Object.entries(CSV_TO_ZONE_MAP)) {
    const val = (row as unknown as Record<string, unknown>)[csvCol];
    if (typeof val === "number") {
      measurements[zoneKey] = val;
    }
  }
  return measurements;
}
