import { type Contrast, research, sourcesFor } from "./explanations";

export type Insight = {
  field: string;
  interpretation: string;
  sourceIds: string[];
};
export type Commentary = {
  insights: Insight[];
  method: "grounded-ai" | "curated-fallback";
  sources: typeof research;
};
export const commentaryCaution =
  "Research describes population patterns, not the cause of your estimate. Model comparisons are separate, not additive or causal. They cannot predict the payoff from changing a major or job.";

// Do not accept provider-authored links, amounts, statistics, or promises.
// These checks constrain output; they are not proof of factual entailment.
const prohibited =
  /[\d$€£<>]|https?:|www\.|\b(percent|percentage|dollars?|thousand|million|billion|median|discriminat\w*|inferior|superior|guarantee\w*|will earn|will increase|will decrease|causes? your|caused by|because you are|proves? that|definitely|certainly)\b/i;
export function parseCommentary(
  answer: string,
  effects: Contrast[],
): Commentary {
  const allowed = sourcesFor(effects);
  try {
    if (answer.length > 6000) throw Error("long output");
    const parsed: unknown = JSON.parse(
      answer
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, ""),
    );
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("insights" in parsed) ||
      !Array.isArray(parsed.insights) ||
      parsed.insights.length < 1 ||
      parsed.insights.length > 3
    )
      throw Error("invalid output");
    const insights: Insight[] = [];
    for (const item of parsed.insights) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.field !== "string" ||
        typeof item.interpretation !== "string" ||
        item.interpretation.length < 30 ||
        item.interpretation.length > 650 ||
        prohibited.test(item.interpretation) ||
        !Array.isArray(item.sourceIds) ||
        item.sourceIds.length < 1 ||
        item.sourceIds.length > 2 ||
        insights.some((i) => i.field === item.field)
      )
        throw Error("invalid insight");
      const effect = effects.find((e) => e.field === item.field);
      if (
        !effect ||
        !item.sourceIds.every(
          (id: unknown) =>
            typeof id === "string" &&
            allowed.some((s) => s.id === id && s.fields.includes(item.field)),
        )
      )
        throw Error("unsupported citation");
      // Require the personalized passage to mention its actual selected category.
      if (
        !item.interpretation
          .toLowerCase()
          .includes(effect.selected.toLowerCase())
      )
        throw Error("generic passage");
      insights.push({
        field: item.field,
        interpretation: item.interpretation.trim(),
        sourceIds: [...new Set<string>(item.sourceIds)],
      });
    }
    return {
      insights,
      method: "grounded-ai",
      sources: allowed.filter((s) =>
        insights.some((i) => i.sourceIds.includes(s.id)),
      ),
    };
  } catch {
    const insights = effects
      .flatMap((e) => {
        const source = allowed.find((s) => s.fields.includes(e.field));
        return source
          ? [
              {
                field: e.field,
                interpretation: `For your ${e.selected} selection, consider this population research context: ${source.fact}`,
                sourceIds: [source.id],
              },
            ]
          : [];
      })
      .slice(0, 3);
    return {
      insights,
      method: "curated-fallback",
      sources: allowed.filter((s) =>
        insights.some((i) => i.sourceIds.includes(s.id)),
      ),
    };
  }
}
