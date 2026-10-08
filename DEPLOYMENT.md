# Deployment checklist

## Free guest site

Create a Cloudflare Pages project linked to the repository. Root: client. Build: pnpm install --frozen-lockfile && pnpm build. Output: dist. Node: 24. Pin pnpm 11.19.0 or use the repository packageManager setting. No environment variables are needed for guest predictions. Confirm model bundle delivery, static routing, mobile layout, and guest reload privacy using the preview deployment before release. Avoid deploying the old render.yaml; it has been removed.

## Accounts

User actions: create a free Supabase project; configure Google/GitHub OAuth credentials and authorized redirect URLs; arrange a verified free SMTP sender. Supabase's built-in sender cannot deliver public signups. No domain purchase is assumed; provider eligibility must be checked before selecting email delivery.

1. Apply supabase/migrations/001_predictions.sql in the SQL editor.
2. Enable email confirmation; use at least eight-character passwords. Configure confirmation/reset redirect URLs for both localhost and the Pages URL.
3. If showing signup verification codes, configure the email template to include the provider-supported token. Otherwise the confirmation-link flow remains available. Verification is proof of email ownership, not automatic second-factor authentication on every login.
4. Copy client/.env.example to client/.env.local for local use, or set the corresponding Pages variables. Only URL and publishable/anon key belong there; never service-role credentials.
5. Test two real accounts: user A saves; user B cannot select/delete A's prediction; guest cannot insert; A can delete its own prediction. Verify confirmation delivery and password recovery before enabling public email signup.
6. Verify export and planned backup behavior. Supabase Free may pause after inactivity; guest predictions remain usable.

## Optional extended explanations

Turnstile verification and per-location request limits are now implemented. Follow [worker/README.md](worker/README.md) for the separate explanation Worker, private secret, production origin, frontend build variables, and live validation. Explanations default to disabled until configuration is ready. The current frontend is deployed as Workers Static Assets; use its workers.dev origin for authentication and AI configuration rather than a Pages example URL.

The worker directory contains a Cloudflare AI adapter. User action: create/connect a Cloudflare account. Install the pinned worker dependency, update ALLOWED_ORIGIN to the exact frontend origin, then deploy through Wrangler after local checks. Set VITE_EXPLANATION_URL on the frontend to the deployed route.

Stay on the Free plan and a free-eligible model. Add tested rate limiting/bot protection and an application-level quota guard before making the endpoint public. CORS alone is not abuse prevention. The adapter caps context/output but does not independently recompute the browser estimate. Add provider-output grounding/citation evaluations before claiming validated RAG. Secrets never belong in the client. Quota-exhaustion responses include next 00:00 UTC; frontend localizes it. Generic provider errors get a generic retry message.

Profile inputs are not submitted for guest prediction; optional explanation submits only displayed numeric context and short feature labels/deltas. The application does not persist those requests. Provider retention policies are separate and must be disclosed.

## Python reference service

Build Docker from the repository root and publish port 8000 if needed for a local demo. API has no accounts or storage responsibilities in this deployment; Supabase owns auth/history. MODEL_BUNDLE overrides the artifact path; CORS_ORIGINS overrides allowed frontend origins. Missing artifact returns readiness 503. Docker build/run has not been verified here because Docker is unavailable.

## Still required before public release

- Account/SMTP/OAuth configuration and real ownership/verification tests.
- Worker abuse controls and grounding tests if extended AI is enabled.
- Static-site preview smoke test and a documented production rollback.
- Decide whether to ship the career model as an explicitly limited exploratory demo despite missing its 10% MAE-improvement gate; no automatic promotion is implied.
- Review public model/aggregate publication against the applicable extract terms.
