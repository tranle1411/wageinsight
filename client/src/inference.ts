import type { Bundle, Forest, Profile, Prediction, Variant } from "./types";
export function forestPredict(forest: Forest, x: number[]): number {
  let value = forest.base;
  for (const tree of forest.trees) {
    let node = 0;
    while (tree.left[node] !== -1) {
      const v = Math.fround(x[tree.feature[node]]);
      node = Number.isNaN(v)
        ? tree.defaultLeft[node]
          ? tree.left[node]
          : tree.right[node]
        : v < tree.threshold[node]
          ? tree.left[node]
          : tree.right[node];
    }
    value += tree.threshold[node];
  }
  return value;
}
function encode(model: Variant, profile: Profile): number[] {
  return model.features.map((f) =>
    f === "AGE"
      ? profile[f]
      : (model.maps[f][String(profile[f])] ?? model.fallback),
  );
}
function values(
  bundle: Bundle,
  profile: Profile,
  variant: string,
  year: number,
) {
  const model = bundle.variants[variant];
  const x = encode(model, profile);
  const q = model.forests.map((f) => forestPredict(f, x)).sort((a, b) => a - b);
  const factor = bundle.inflation[String(year)];
  if (!factor) throw new Error("Choose a year supported by this dataset.");
  return {
    estimate: Math.exp(q[1]) * factor,
    lower: Math.exp(q[0] - model.calibration) * factor,
    upper: Math.exp(q[2] + model.calibration) * factor,
  };
}
export function predict(
  bundle: Bundle,
  profile: Profile,
  variant = "career",
  year = bundle.baseYear,
): Prediction {
  const model = bundle.variants[variant];
  if (!model) throw new Error("Unsupported model.");
  if (!Number.isInteger(profile.AGE) || profile.AGE < 25 || profile.AGE > 64)
    throw new Error("Age must be 25–64.");
  for (const f of model.features)
    if (f !== "AGE" && !bundle.options[f]?.some((o) => o.value === profile[f]))
      throw new Error(`Choose a valid ${f}.`);
  const result = values(bundle, profile, variant, year);
  return {
    ...result,
    year,
    variant,
    modelVersion: bundle.version,
    curve: Array.from({ length: 40 }, (_, i) => ({
      age: i + 25,
      ...values(bundle, { ...profile, AGE: i + 25 }, variant, year),
    })),
    effects: model.features
      .filter((f) => f !== "AGE")
      .map((field) => ({
        field,
        delta:
          result.estimate -
          values(
            bundle,
            { ...profile, [field]: model.reference[field] },
            variant,
            year,
          ).estimate,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
  };
}
