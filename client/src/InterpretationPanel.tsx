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
  const matching = effects.filter((e) => e.selected === e.reference);
  const comparable = effects.filter((e) => e.selected !== e.reference);
  const names: Record<string, string> = {
    EDUCD: "education level",
    DEGFIELD: "degree field",
    OCC: "occupation",
    IND: "industry",
    SEX: "sex",
    RACE: "race",
    HISPAN: "Hispanic origin",
    MARST: "marital status",
    CITIZEN: "citizenship",
    SPEAKENG: "English proficiency",
    VETSTAT: "veteran status",
    STATEFIP: "state",
  };
  return (
    <div className="feature-explanation">
      <p>
        Your full profile's modeled median is{" "}
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(prediction.estimate)}
        . This is not a group median for any single characteristic.
      </p>
      {matching.length > 0 && (
        <p>
          Matching reference categories:{" "}
          {matching.map((e) => names[e.field]).join(", ")}. Those comparisons
          show no difference because the inputs are identical, not because these
          features never matter.
        </p>
      )}
      {profile.EDUCD >= 101 &&
        bundle.variants[prediction.variant].reference.DEGFIELD === 0 && (
          <p>
            No degree-field contrast is shown: the reference has no applicable
            degree field, which is incompatible with holding your
            bachelor's-or-higher education fixed.
          </p>
        )}
      {profile.EDUCD >= 101 !==
        bundle.variants[prediction.variant].reference.EDUCD >= 101 && (
        <p>
          No education-level contrast is shown because changing it alone would
          make the degree-field combination inconsistent.
        </p>
      )}
      {["education", "profession", "demographics", "location"].map((group) => {
        const list = comparable.filter((e) => featureGroups[e.field] === group);
        if (!list.length) return null;
        return (
          <section key={group}>
            <h4>
              {
                {
                  education: "Education",
                  profession: "Occupation and industry",
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
        Each displayed contrast uses the model's reference category with other
        inputs fixed. Incompatible education comparisons are omitted. These are
        separate model comparisons, not additive contributions, causal effects,
        or SHAP values. Other combinations may still be uncommon in the data.
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
