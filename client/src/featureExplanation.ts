import type { Bundle, Prediction, Profile } from "./types";
import { type Contrast, featureGroups } from "../../shared/explanations";
export function labeledContrasts(
  bundle: Bundle,
  profile: Profile,
  prediction: Prediction,
): Contrast[] {
  const model = bundle.variants[prediction.variant];
  if (!model) return [];
  const label = (field: string, value: number) =>
    bundle.options[field]?.find((o) => o.value === value)?.label ??
    "Unknown category";
  return prediction.effects
    .filter((e) => featureGroups[e.field])
    .map((e) => ({
      ...e,
      selected: label(e.field, profile[e.field]),
      reference: label(e.field, model.reference[e.field]),
    }));
}
export function contrastSentence(effect: Contrast) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.abs(effect.delta));
  if (Math.abs(effect.delta) < 0.5)
    return `${effect.selected}: no rounded change relative to ${effect.reference} in this comparison.`;
  return `${effect.selected}: the model's median estimate is ${amount} ${effect.delta > 0 ? "higher" : "lower"} than with ${effect.reference}, holding the other inputs fixed.`;
}
