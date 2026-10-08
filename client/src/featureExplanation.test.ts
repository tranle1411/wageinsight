import { it, expect } from "vitest";
import { contrastSentence } from "./featureExplanation";
import {
  selectContrasts,
  sourcesFor,
  selectResearch,
} from "../../shared/explanations";
import { labeledContrasts } from "./featureExplanation";
import { predict } from "./inference";
import raw from "../public/models/bundle.json";
import type { Bundle } from "./types";
const effect = (field: string, delta: number) => ({
  field,
  delta,
  selected: "Selected category",
  reference: "Reference category",
});
it("omits incompatible degree references, including legacy saved contrasts", () => {
  const bundle: Bundle = JSON.parse(JSON.stringify(raw));
  const profile = {
    ...bundle.variants.demographic.reference,
    AGE: 35,
    EDUCD: 101,
    DEGFIELD: 62,
  };
  const result = predict(bundle, profile, "demographic");
  expect(result.effects.some((e) => e.field === "DEGFIELD")).toBe(false);
  expect(
    labeledContrasts(bundle, profile, {
      ...result,
      effects: [{ field: "DEGFIELD", delta: 22942 }],
    }),
  ).toEqual([]);
  const withoutDegree = predict(
    bundle,
    { ...profile, EDUCD: 65, DEGFIELD: 0 },
    "demographic",
  );
  expect(
    withoutDegree.effects.some(
      (e) => e.field === "EDUCD" || e.field === "DEGFIELD",
    ),
  ).toBe(false);
  bundle.variants.demographic.reference.DEGFIELD = 21;
  const compatible = predict(bundle, profile, "demographic");
  expect(compatible.effects.some((e) => e.field === "DEGFIELD")).toBe(true);
  const missingField = predict(
    bundle,
    { ...profile, DEGFIELD: 0 },
    "demographic",
  );
  expect(missingField.effects.some((e) => e.field === "DEGFIELD")).toBe(false);
});
it("accepts approved research IDs but never displays invented AI salary prose", () => {
  const allowed = sourcesFor([effect("SEX", 0), effect("EDUCD", 0)]);
  expect(
    selectResearch('{"sourceIds":["education"]}', allowed).selected.map(
      (s) => s.id,
    ),
  ).toEqual(["education"]);
  for (const answer of [
    "Everyone earns $111458.",
    '{"sourceIds":["invented-source"]}',
    '{"sourceIds":[]}',
  ]) {
    const selection = selectResearch(answer, allowed);
    expect(selection.method).toBe("curated-fallback");
    expect(selection.selected.every((s) => allowed.includes(s))).toBe(true);
    expect(JSON.stringify(selection)).not.toContain("111458");
  }
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
