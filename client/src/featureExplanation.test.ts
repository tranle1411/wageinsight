import { it, expect } from "vitest";
import { contrastSentence } from "./featureExplanation";
import { selectContrasts, sourcesFor } from "../../shared/explanations";
const effect = (field: string, delta: number) => ({
  field,
  delta,
  selected: "Selected category",
  reference: "Reference category",
});
it("describes reference direction and rounded zero without inventing causal effects", () => {
  expect(contrastSentence(effect("EDUCD", 1200))).toContain("$1,200 higher");
  expect(contrastSentence(effect("OCC", -2400))).toContain("$2,400 lower");
  expect(contrastSentence(effect("SEX", 0))).toContain("no rounded change");
  expect(contrastSentence(effect("SEX", 0))).not.toContain("does not affect");
});
it("preserves education and profession when demographic contrasts dominate", () => {
  const selected = selectContrasts([
    effect("SEX", 99999),
    effect("RACE", -88888),
    effect("HISPAN", 77777),
    effect("EDUCD", 20),
    effect("DEGFIELD", 10),
    effect("OCC", 5),
    effect("IND", 4),
    effect("STATEFIP", 2),
  ]);
  expect(selected.map((e) => e.field)).toEqual([
    "EDUCD",
    "DEGFIELD",
    "OCC",
    "IND",
    "SEX",
    "RACE",
    "STATEFIP",
  ]);
});
it("does not attach unsupported research mechanisms to veteran status or citizenship", () => {
  expect(sourcesFor([effect("VETSTAT", 200), effect("CITIZEN", 100)])).toEqual(
    [],
  );
  expect(sourcesFor([effect("EDUCD", 200)]).map((s) => s.id)).toEqual([
    "education",
  ]);
  expect(
    sourcesFor([effect("SEX", 100)]).some((s) => s.id === "flexibility"),
  ).toBeTruthy();
});
