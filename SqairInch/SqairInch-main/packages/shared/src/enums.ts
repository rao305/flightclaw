import { z } from "zod";

export const FabricTypeSchema = z.enum(["STRETCHY", "MODERATE", "STIFF"]);
export type FabricType = z.infer<typeof FabricTypeSchema>;
export const FabricTypeEnum = FabricTypeSchema.enum;

export const FitClassSchema = z.enum(["TIGHT", "PERFECT", "LOOSE", "UNKNOWN"]);
export type FitClass = z.infer<typeof FitClassSchema>;
export const FitClassEnum = FitClassSchema.enum;

export const GarmentCategorySchema = z.enum(["top", "bottom", "full_body"]);
export type GarmentCategory = z.infer<typeof GarmentCategorySchema>;
export const GarmentCategoryEnum = GarmentCategorySchema.enum;

export const BodyShapeSchema = z.enum([
  "rectangle",
  "pear",
  "apple",
  "hourglass",
  "inverted_triangle",
]);
export type BodyShape = z.infer<typeof BodyShapeSchema>;
export const BodyShapeEnum = BodyShapeSchema.enum;

export const GenderSchema = z.enum(["M", "F", "NB"]);
export type Gender = z.infer<typeof GenderSchema>;
export const GenderEnum = GenderSchema.enum;
