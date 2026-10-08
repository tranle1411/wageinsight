import { it, expect } from "vitest";
import bundle from "../public/models/bundle.json";
import fixtures from "./parity-fixtures.json";
import { predict } from "./inference";
import type { Bundle } from "./types";
it("matches Python reference across variants, ages, and dollar years", () => {
  for (const f of fixtures) {
    const result = predict(
      bundle as unknown as Bundle,
      f.profile,
      f.variant,
      f.year,
    );
    for (const key of ["estimate", "lower", "upper"] as const)
      expect(result[key]).toBeCloseTo(f.expected[key], 5);
  }
});
