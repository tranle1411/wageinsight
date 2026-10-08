# Deployment and rollback

Frontend: https://wageinsight.chantranle-2026.workers.dev
Explanation API: https://wageinsight-explanations.chantranle-2026.workers.dev

Tran Le confirms all login methods are live. Existing auth configuration should be retained. The new revision and migration below have not been deployed by this task.

## Frontend Worker

Cloudflare Workers Builds: repository root directory client; build command `pnpm install --frozen-lockfile && pnpm build`; deploy command `pnpm deploy`. Use Node 24 and the repository pnpm version. The checked-in wrangler.jsonc deploys dist as SPA static assets. Configure build-time VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_EXPLANATION_URL and VITE_TURNSTILE_SITE_KEY using the existing live values. Do not put service-role keys in Vite variables. Runtime-only dashboard variables cannot update a compiled Vite bundle.

Local checks: `pnpm --dir client test`, `pnpm --dir client build`, `pnpm --dir client check:deploy`.

## Explanation Worker

Workers Builds: repository root worker; build command `pnpm install --frozen-lockfile`; deploy command `pnpm deploy`. Retain TURNSTILE_SECRET_KEY as a secret on this Worker. Its widget must permit the frontend hostname and its action is explain. The exact production origin/hostname and AI/IP rate bindings are in worker/wrangler.toml.

The updated response adds personalized commentary and canonical cited sources while preserving text and selectionMethod. Existing frontend requests remain accepted; deploy the Worker first, then rebuild/deploy the frontend. The existing public enable flag stays true. Setting it false is the immediate kill switch; update source too if disabling should survive redeployment.

Stay on Workers Free. Burst limits are per Cloudflare location, not global accounting; the provider free allocation is account-wide. Inspect actual account usage. Exhaustion displays the next UTC reset; generic outages do not fabricate a reset. Request bodies, tokens, IPs, selected labels and provider exceptions are never written to application logs. Outcome/status/duration and validation mode are logged; trace sampling is 10%. Third-party provider retention remains separate.

Local check: `pnpm --dir worker check`. Unit and Playwright checks mock AI/Siteverify; live relevance and real token success/replay need a smoke test after deployment.

## Database change

Apply supabase/migrations/002_history_limits.sql once, after the existing 001 migration. It limits new saved JSON payloads and serializes inserts per owner to enforce 100 saved results. Old oversized rows remain readable. Existing ownership policies stay in force. This migration has not been run against the live database here.

Verify: save/open/compare/export/delete, signed-out guest rejection, two-user isolation, email verification/recovery and both OAuth redirects. Reuse existing test accounts; do not expose credentials in chat.

## Rollback

Before release, record the current successful frontend and explanation Worker version IDs in Cloudflare. Keep the current model artifact version and its checksum. Roll back each Worker to its recorded previous version in Deployments if needed. Database schema/data are not rolled back with Worker code. Migration 002 is additive and compatible with the old client; no destructive rollback is planned. Model training writes candidates locally and does not overwrite the public artifact.

## Release interpretation

The current model misses the career 10% improvement gate and has wide income intervals. Ship as an explicitly exploratory portfolio demo; do not describe it as an accurate salary offer predictor. Pipeline quality status remains separate from whether the web demo is deployed. Docker reference configuration has not been run on a Docker engine in this task.
