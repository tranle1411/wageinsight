# WageInsight explanation Worker

Local implementation: Turnstile verification of action `explain` and exact frontend hostname before AI; expired/replayed tokens fail closed. Request bodies are bounded at 8192 bytes while streaming. No profile, token, secret, IP, or body is logged by application code. An IP is transiently sent to Siteverify and used as a rate-limit key; Turnstile is a third-party service.

The Explain panel provides deterministic education, occupation/industry, demographic (when enabled), and location comparisons even without AI. Incompatible degree-field references and education-level changes that cross degree eligibility are omitted, including when viewing legacy saved contrasts. Matching reference categories are summarized once. Valid contrasts hold other inputs fixed; they are not SHAP values, additive contributions, or causal effects. Other reference combinations can still be uncommon.

AI writes personalized commentary grounded in supplied primary-source facts. It receives selected/reference categories and qualitative model directions, but no salary amounts or dollar contrasts. The response has one to three field-specific passages with approved citations. Runtime checks enforce schema, category mentions, field/source compatibility, bounded text and several unsafe-output restrictions. Invalid output falls back to curated facts. This constrains errors but does not prove semantic grounding; live human review remains necessary. Canonical links and evidence details render in the frontend. Numerical comparisons stay deterministic. No per-request web retrieval runs, and no vector database is required for this small curated corpus.

If the deployed frontend says “AI commentary is not connected yet” (or the older “The local summary remains available”), VITE_EXPLANATION_URL was absent at build time. Add it under the frontend Worker's **Build variables and secrets**, then rebuild. Runtime-only variables cannot fix an already-built Vite bundle. Redeploy both frontend and explanation Worker after this request-contract update; the new Worker expects field codes and selected/reference labels. Legacy unlabeled requests are rejected.

Public origin: https://wageinsight.chantranle-2026.workers.dev
Public site key: 0x4AAAAAAFRoPuaUHU9CkU1d

## Local checks

~~~powershell
pnpm --dir worker install --frozen-lockfile
pnpm --dir worker types
pnpm --dir worker check
pnpm --dir client test
pnpm --dir client build
pnpm --dir client exec playwright test --config playwright.explanations.config.ts
~~~

The browser tests mock Turnstile and AI, not real production tokens. Worker tests mock Siteverify and its replay rejection. Live success and real replay rejection remain required.

## Deploy through Workers Builds

Publish these code changes to the repository before setting up the build. No commit, push, or deployment is performed by this implementation task.

Create a separate Worker linked to the same repository, named `wageinsight-explanations`:
- Root directory: `worker`
- Build command: `pnpm install --frozen-lockfile`
- Deploy command: `pnpm run deploy`
- Node: 24; pnpm: 11.19.0
- Wrangler reads `wrangler.toml`; do not use the frontend static-assets deploy command.
- Stay on Workers Free. No paid billing method or AI Gateway prepaid credits are required for the selected model.

The configuration now persists `EXPLANATIONS_ENABLED=true` after the user verified the live integration. Missing secrets or verification bindings still fail closed. In the explanation Worker's Settings -> Variables and Secrets, add the Turnstile widget's private secret as a **Secret** named `TURNSTILE_SECRET_KEY` if absent. Paste it directly from your Turnstile dashboard; never put it in chat, source, or a VITE variable.

Deployments no longer reset explanations to false. Change runtime EXPLANATIONS_ENABLED to false for an immediate kill switch, and also update wrangler.toml to false if it must remain disabled across future deployments.

Verify the AI, IP_LIMITER, and AI_LIMITER bindings exist. Secret storage must target `wageinsight-explanations`, not the frontend Worker.

In the existing frontend Worker's **Build variables and secrets**, set:
- `VITE_EXPLANATION_URL=https://wageinsight-explanations.chantranle-2026.workers.dev` (use the actual resulting URL)
- `VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFRoPuaUHU9CkU1d`

Rebuild the frontend. Your widget must allow `wageinsight.chantranle-2026.workers.dev`. Production rejects localhost. For local real-widget development, use a separate widget and local backend config; don't add local hostnames to the production verifier.

## Limits and release checks

IP limiter: 5 attempts/minute; AI limiter: 20 verified requests/minute per Cloudflare location. Native limits are permissive, not exact global quotas. Guests sharing an IP can share the limit. No in-memory counters or eventual-consistency KV counters are presented as a daily spending cap.

Workers Free enforces its account-wide daily neuron allowance; other Workers on the account share that allowance. Remain on Free to prevent paid overage. Explicit provider daily exhaustion includes next 00:00 UTC; ordinary failures and burst limits don't fabricate a daily reset time.

Before claiming live readiness:
1. Produce an estimate, open Explain, complete Turnstile, receive AI text.
2. Verify a fresh real token succeeds once and replay is rejected without a second AI call.
3. Check invalid hostname/action, expiry, disabled service, and limits.
4. Review personalized output across education/profession/demographic cases for faithfulness to cited evidence. Schema/citation checks do not replace human review of grounding.
5. Confirm token/secret/profile data is absent from logs and avoid adding body logging.

Docs: [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
