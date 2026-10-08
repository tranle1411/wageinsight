import { expect, it } from "vitest";
import { parseCommentary } from "../../shared/personalized";
const effects = [
  {
    field: "EDUCD",
    selected: "Master's degree",
    reference: "Bachelor's degree",
    delta: 3000,
  },
];
const insight = {
  field: "EDUCD",
  interpretation:
    "Your Master's degree selection connects to research on education and earnings. These broad associations do not establish your individual return to education.",
  sourceIds: ["education"],
};
it("accepts personalized cited commentary without changing salary numbers", () => {
  const result = parseCommentary(
    JSON.stringify({ insights: [insight] }),
    effects,
  );
  expect(result.method).toBe("grounded-ai");
  expect(result.sources.map((s) => s.id)).toEqual(["education"]);
});
it.each([
  { ...insight, sourceIds: ["invented"] },
  { ...insight, sourceIds: ["flexibility"] },
  {
    ...insight,
    interpretation: "Your Master's degree guarantees a $200000 salary.",
  },
  {
    ...insight,
    interpretation: "Your Master's degree proves that you will earn more.",
  },
  {
    ...insight,
    interpretation:
      "Generic research says education can be associated with earnings.",
  },
  { ...insight, field: "SEX" },
  {
    ...insight,
    interpretation:
      "Your Master's degree: visit https://evil.example for evidence.",
  },
])("falls back for unsupported or unsafe output: %j", (bad) => {
  const result = parseCommentary(JSON.stringify({ insights: [bad] }), effects);
  expect(result.method).toBe("curated-fallback");
  expect(result.insights[0].sourceIds).toEqual(["education"]);
  expect(result.insights[0].interpretation).not.toContain("200000");
});
it("returns no invented context when research is unavailable", () => {
  const result = parseCommentary("not JSON", [
    {
      field: "VETSTAT",
      selected: "Veteran",
      reference: "Not a veteran",
      delta: 3,
    },
  ]);
  expect(result.insights).toEqual([]);
});
