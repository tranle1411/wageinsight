import type { Bundle, Prediction, Profile } from "./types";
import { labeledContrasts, contrastSentence } from "./featureExplanation";
import { featureGroups, sourcesFor } from "../../shared/explanations";
export function FeatureExplanation({
  bundle,
  profile,
  prediction,
}: {
  bundle: Bundle;
  profile: Profile;
  prediction: Prediction;
}) {
  const effects = labeledContrasts(bundle, profile, prediction);
  const sources = sourcesFor(effects);
  return (
    <div className="feature-explanation">
      {["education", "profession", "demographics", "location"].map((group) => {
        const list = effects.filter((e) => featureGroups[e.field] === group);
        if (!list.length) return null;
        return (
          <section key={group}>
            <h4>
              {
                {
                  education: "Education",
                  profession: "Profession",
                  demographics: "Demographic associations",
                  location: "Location",
                }[group]
              }
            </h4>
            <ul>
              {list.map((e) => (
                <li key={e.field}>{contrastSentence(e)}</li>
              ))}
            </ul>
          </section>
        );
      })}
      {prediction.variant === "career" && (
        <p>
          Demographics were not used in this estimate. Enable demographic
          exploration to see those comparisons.
        </p>
      )}
      <p className="help">
        Each contrast uses the model's most common training category as a
        reference. Zero is not evidence that a feature never matters. These are
        separate model comparisons, not additive contributions, causal effects,
        or SHAP values. Some reference combinations may be uncommon or
        inapplicable to your profile.
      </p>
      <details className="research-context">
        <summary>Research context and sources</summary>
        <p>
          These sources describe population patterns. They do not establish the
          cause of your model's dollar differences.
        </p>
        {sources.map((s) => (
          <section key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">
              [{s.id}] {s.title} ↗
            </a>
            <p>{s.fact}</p>
          </section>
        ))}
        {effects.some((e) =>
          ["CITIZEN", "SPEAKENG", "MARST", "VETSTAT", "STATEFIP"].includes(
            e.field,
          ),
        ) && (
          <p>
            No feature-specific research explanation is supplied here for
            citizenship, English proficiency, marital status, veteran status or
            state. Their contrasts are model observations.
          </p>
        )}
      </details>
    </div>
  );
}
