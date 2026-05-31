# SV Booking Production Runbook

## Goal

Bring the system from local-ready to production-ready without adding fake data or exposing secrets.

## Required Environment

Set these in the deployment environment, not in git:

- `ADMIN_API_SECRET`
- `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `KINDE_CLIENT_ID`
- `KINDE_CLIENT_SECRET`
- `KINDE_ISSUER_URL`
- `KINDE_SITE_URL`
- `KINDE_POST_LOGOUT_REDIRECT_URL`
- `KINDE_POST_LOGIN_REDIRECT_URL`

Set at least one partner pricing provider:

- `RAPIDAPI_KEY`
- `SERPAPI_KEY`
- `MAKCORPS_API_KEY`
- `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET`

Optional production capabilities:

- `TICKETMASTER_API_KEY`
- `OPENTRIPMAP_API_KEY`
- `PRICE_ALERT_WEBHOOK_URL`
- `PRICE_ALERT_WEBHOOK_SECRET`
- `PRICE_ALERT_UNSUBSCRIBE_SECRET`
- `OPS_ALERT_WEBHOOK_URL`
- `OPS_ALERT_WEBHOOK_SECRET`
- `REVIEWS_PROVIDER_NAME`
- `REVIEWS_PROVIDER_LICENSED`

## Go-Live Gate

Run these before production deployment:

```bash
npm run audit:production
npm run audit:production:strict
npm run audit:guardrails
npm run audit:provenance
npm run audit:deployment-smoke
npm run audit:catalog
npm run audit:docs
npm run audit:env
npm run audit:secrets
npm run audit:runtime
npm run audit:external-fetches
npm run audit:public-api-urls
npm run audit:affiliate-security
npm run audit:security-responses
npm run audit:api-errors
npm run audit:cron-cache
npm run audit:ops
npm run audit:agents
npm run audit:duplicates
npm run audit:providers
npm run audit:reviews
npm run audit:release-deletions
npm run audit:i18n
npm run audit:price-accuracy
npm run audit:pwa
npm run audit:ops-scorecard
npm run audit:ui-quality
npm run audit:accessibility
npm run audit:seo
npm run audit:html-safety
npm run audit:csrf
npm run audit:storage
npm run audit:data-retention
npm run audit:privacy
npm run audit:alerts
npm run lint
npm test
npm run build
npm run test:e2e
npm run release:state:strict
```

`audit:production` prints variable names and configured/missing status only. It must never print secret values.
`audit:production:strict` is the go-live blocker and must pass in the deployment environment.
`release:state:strict` is the release hygiene blocker and must pass only after intended changes are staged/committed and generated artifacts are excluded.
The public API URL safety E2E audit must stay enabled; it scans public JSON API responses for non-HTTPS, credentialed, localhost, private-network, `javascript:`, and `data:` URLs.
After deployment, run `SITE_URL=https://your-deployment.example npm run smoke:deployment`. Add `ADMIN_API_SECRET` to that command for authenticated admin smoke checks. Add `CRON_SECRET` and `SMOKE_RUN_CRON=1` only when you intentionally want the cron orchestrator smoke to execute against the deployment.

## Cron Verification

`vercel.json` must include:

- `/api/agents/auto/orchestrate` daily
- `/api/price-alerts/evaluate` every 6 hours
- `/api/ops/alerts/evaluate` every 6 hours offset from price alerts

After deployment, verify:

- `/api/health` returns no secret values.
- `/api/health` shows persistent cache when Upstash is configured.
- `/api/health` shows alert delivery `configured` only after webhook env is configured.
- `/api/health` shows PWA installability and push readiness without exposing push keys.
- `/api/ops/scorecard` requires admin bearer auth and lists production/inventory/review/mobile/localization/observability blockers.
- `/api/ops/alerts/evaluate` requires cron auth, returns `not-configured` until `OPS_ALERT_WEBHOOK_URL` and `OPS_ALERT_WEBHOOK_SECRET` are configured, and sends only sanitized critical/warning Ops alerts.
- `/api/ops/alerts/events` requires admin bearer auth and returns sanitized delivery history only, never webhook secrets or authorization headers.
- `/api/admin/*` requires a logged-in Kinde user whose id or email appears in `ADMIN_USER_IDS` or `ADMIN_EMAILS`; it forwards only allowlisted dashboard operations server-side and never exposes bearer secrets.
- `/api/agents/auto/status` requires admin bearer auth.
- `/api/price-alerts/events` requires admin bearer auth.
- `/api/price-alerts/history` requires the logged-in user and returns only that user's fingerprinted event history.
- `/api/price-alerts/unsubscribe` returns `not-configured` until an unsubscribe secret is configured.

## Catalog Expansion

Run discovery agents only after persistent KV is configured. Agents write candidates to review queue; they must not auto-promote hotels.

Promotion path:

1. Agents write `pending` candidates.
2. Admin reviews `/api/catalog/candidates`. `/api/agents/discovered` remains a compatibility surface.
3. Admin approves only candidates with verified source/provenance and complete `hotelKey`, `name`, `city`, `country`.
4. Approved candidate is promoted to catalog persistence.

Queue filters:

- `status=pending|approved|rejected|stale`
- `duplicate=true`
- `missingProvenance=true`

## Price Accuracy

`POST /api/price-accuracy` records user/provider mismatch reports only for known providers and numeric quoted/observed totals.
`GET /api/price-accuracy` requires admin bearer auth and returns provider mismatch metrics from observed click and mismatch ledgers.

Trust scores must not be displayed until enough verified observations exist.

## Pricing Cache Agent

`/api/agents/auto/price-cache` now prewarms two separate data classes:

- Dated provider rates for active price alerts first, then catalog-priority hotels.
- Heatmaps as `priceSource` trend data only, never as booking-provider offers.

Use `catalogLimit` and `heatmapLimit` query params for controlled backfills. The route is cron-protected, returns `Cache-Control: no-store`, and still requires durable KV plus provider keys for production scale.

## Reviews And Property Content

`/api/reviews/:hotelKey` and `/api/property-content/:hotelKey` return explicit unavailable states unless licensed/partner-backed data is configured.
Do not store local user reviews as product review content.

## Price Alerts

Alerts are safe before delivery is configured:

- Storage works for authenticated users.
- Evaluation records trigger events only from verified, fresh provider prices.
- Stale, partial, heatmap, unavailable, or unknown-source prices can update evaluation metadata but must not trigger delivery.
- Delivery stays `not-configured`.
- User history is available at `/api/price-alerts/history`; admin delivery events are available at `/api/price-alerts/events`.

After setting `PRICE_ALERT_WEBHOOK_URL`, `PRICE_ALERT_WEBHOOK_SECRET`, and `PRICE_ALERT_UNSUBSCRIBE_SECRET`, triggered alert events are sent as sanitized payloads with `userFingerprint` and a deterministic unsubscribe token, not raw user IDs.

## Mobile/PWA Retention

The app has an installable manifest, production-only service worker registration, and an offline fallback. API requests remain network-only so stale hotel prices are not served as fresh data.

Push delivery remains `not-configured` until `NEXT_PUBLIC_PUSH_PUBLIC_KEY` and `PUSH_PRIVATE_KEY` are configured with an approved notification provider. Do not claim push alerts are available until `/api/health` reports push readiness.

## Ops Scorecard

Use `/api/ops/scorecard` with admin bearer auth to review current blockers across production readiness, inventory scale, reviews/property content, mobile retention, localization, and observability.

The scorecard is advisory and evidence-based. It must not replace `npm run audit:production:strict` as the go-live gate.

Use `/api/ops/alerts` with admin bearer auth to review current SLO alerts before go-live and after provider changes. The alert center is internal and no-store; it evaluates production readiness, provider uptime history, price accuracy drift, cache durability, and alert delivery readiness from existing evidence. It must report `insufficient-data` states instead of marking provider uptime or price accuracy healthy without enough events.

Use `/api/ops/alerts/evaluate` as the cron-protected delivery surface. It stores a sanitized delivery event for 30 days and posts only actionable `critical` and `warning` alerts to the configured Ops webhook. Payloads must not include raw secrets, authorization headers, user IDs, or unfiltered upstream errors. Without `OPS_ALERT_WEBHOOK_URL` and `OPS_ALERT_WEBHOOK_SECRET`, delivery remains `not-configured`; the alert report still runs for evidence and retention.

Use `/api/ops/alerts/events` with admin bearer auth to inspect delivery history. The endpoint is no-store and returns only severity counts, delivery status, HTTP status, and timestamps. It must not expose webhook URL, webhook secret, authorization headers, or raw upstream errors.

## Data Retention

`/api/data-retention` is public and returns the retention policy with `Cache-Control: no-store`.

Current operational records use TTL-backed retention:

- Admin audit events: 90 days, redacted details and deterministic client fingerprints only.
- Catalog candidates: 90 days unless promoted/rejected/staled by admin workflow.
- Price observations/mismatch reports: 90 days.
- Price alert trigger events: 30 days and deterministic user fingerprints only.
- Ops alert delivery events: 30 days, severity counts and sanitized delivery status only.
- Provider uptime/probe events: 14 days, sanitized status and latency metadata only.
- Provider trends: 2 days; provider state: 30 days.
- Agent latest status: 1 day; run history: 7 days.

User-owned alerts, favorites, trips, and preferences persist until user action or account retention rules apply. `/api/me/data` lets an authenticated user export account data with `GET` and delete user-owned account data with `DELETE` plus the `x-sv-confirm-delete: DELETE_MY_SV_BOOKING_DATA` confirmation header. The deletion flow also removes that user's price-alert index entry and fingerprinted alert events. Do not store raw secrets in KV-backed operational records.

## Provider Uptime

Use `/api/agents/providers/uptime` with admin bearer auth to inspect the provider uptime ledger. It returns no-store success rate, latency, latest status, and recent sanitized events from live provider attempts and health probes. Raw upstream errors and secret values must not be stored in this ledger.

## Provider Coverage

Use `/api/agents/providers/coverage` with admin bearer auth to inspect provider coverage by observation date, provider, city, and country. It is derived only from `price:observations:*` records and returns `insufficient-data` until verified provider observations exist. Do not present city/country/provider coverage claims in product copy unless this matrix has supporting observations for the relevant scope.

## Non-Negotiable Guardrails

- Do not use `Math.random()`.
- Do not use `crypto.randomUUID()` without explicit approval.
- Do not add fake reviews, fake prices, fake savings, fake social proof, or unsupported marketing claims.
- Unknown data must remain `unknown` or `unavailable`.
- Do not merge discovered hotels without admin approval.
