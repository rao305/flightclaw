import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GetCoefficients } from "./prediction.js";
import type { CoefficientSet } from "./prediction.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default directory for coefficient JSON files (relative to package). */
export const DEFAULT_COEFF_DIR = join(__dirname, "..", "data", "coefficients");

/**
 * Returns a loader that reads coefficient JSON from the filesystem.
 * Use in Node (tests, backend). For browser, pass a loader that uses bundled or fetched JSON.
 */
export function createFileCoefficientLoader(baseDir: string = DEFAULT_COEFF_DIR): GetCoefficients {
  return (gender, bodyShape) => {
    try {
      const path = join(baseDir, `${gender}_${bodyShape}.json`);
      const raw = readFileSync(path, "utf-8");
      return JSON.parse(raw) as CoefficientSet;
    } catch {
      return null;
    }
  };
}
