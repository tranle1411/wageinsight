import { describe, it, expect } from "vitest";
import { forestPredict, predict } from "./inference";
import bundle from "../public/models/bundle.json";
import type { Bundle } from "./types";
describe("portable inference", () => {
  it("uses float32 comparisons and missing branches", () => {
    const tree = {
      left: [1, -1, -1],
      right: [2, -1, -1],
      feature: [0, 0, 0],
      threshold: [1, 3, 7],
      defaultLeft: [true, false, false],
    };
    expect(forestPredict({ base: 10, trees: [tree] }, [0.5])).toBe(13);
    expect(forestPredict({ base: 10, trees: [tree] }, [NaN])).toBe(13);
    expect(forestPredict({ base: 10, trees: [tree] }, [1])).toBe(17);
  });
  it("keeps predictions finite and distinguishes dollar conversion from age", () => {
    const b = bundle as unknown as Bundle;
    const p = b.variants.demographic.reference;
    const now = predict(b, p, "career", 2024);
    const old = predict(b, p, "career", 2018);
    expect(now.lower).toBeGreaterThan(0);
    expect(now.estimate).toBeGreaterThanOrEqual(now.lower);
    expect(now.upper).toBeGreaterThanOrEqual(now.estimate);
    expect(now.curve).toHaveLength(40);
    expect(old.estimate / now.estimate).toBeCloseTo(b.inflation["2018"], 10);
    expect(() => predict(b, { ...p, AGE: 24 })).toThrow();
    expect(() => predict(b, { ...p, OCC: -1 })).toThrow();
  });
});
