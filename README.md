# SV Booking

SV Booking is a Next.js 16 App Router hotel meta-search app. It compares provider-returned hotel rates when configured providers respond, labels unavailable data explicitly, and avoids fabricated hotel, review, price, provider, urgency, or availability data.

Current local catalog: **502 hotels**, **139 cities**, **65 countries**.

## What The App Does

- Search and browse a curated TripAdvisor/Xotelo-keyed hotel catalog.
- Compare provider-returned prices for known hotel keys and dates.
- Surface cheaper-date observations only when provider data supports the comparison.
- Save favorites, trips, recent searches, preferences, and price watches through centralized browser-storage helpers with legacy-key migration.
- Expose authenticated account data export/delete flows.
- Run admin/cron agents for catalog discovery, provider health, price cache warming, price-alert evaluation, and ops alert delivery.
- Return unavailable states for reviews, property content, flights, amenities, events, and prices when licensed or provider-backed data is missing.

## Current Architecture

| Layer | Current implementation |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript + JavaScript |
| Auth | Kinde route handler and protected user pages; production env required |
| Durable storage | Upstash Redis/KV for agent state, audit logs, candidate queues, alerts, and cache state |
| Local state | Centralized `lib/local-storage-keys.ts` helpers only |
| Pricing | Xotelo baseline plus optional SerpAPI, Booking, TripAdvisor, MakCorps, and Amadeus adapters |
| Validation | Guardrail, catalog, provider, review, i18n, PWA, SEO, CSRF, privacy, storage, alert, and production-readiness audits |

## Important Routes

Public product routes:

- `/` home
- `/search`
- `/compare`
- `/compare-hotels`
- `/hotel/[key]`
- `/city/[name]`
- `/deals`
- `/favorites`
- `/trips`
- `/agents`

Core public APIs:

- `GET /api/search`
- `GET /api/compare`
- `GET /api/deals`
- `GET /api/cheaper-dates`
- `GET /api/price-history`
- `GET /api/reviews/[hotelKey]`
- `GET /api/property-content/[hotelKey]`
- `GET /api/i18n`
- `GET /api/data-retention`
- `GET /api/health`

Authenticated user APIs:

- `/api/me/favorites`
- `/api/me/trips`
- `/api/me/prefs`
- `/api/me/data`
- `/api/price-alerts`

Admin or cron APIs:

- `/api/agents/providers`
- `/api/agents/providers/uptime`
- `/api/agents/providers/coverage`
- `/api/agents/discovered`
- `/api/agents/audit`
- `/api/agents/auto/*`
- `/api/catalog/candidates`
- `/api/catalog/discover`
- `/api/catalog/discover-osm`
- `/api/catalog/validate`
- `/api/ops/scorecard`
- `/api/ops/alerts`
- `/api/ops/alerts/evaluate`
- `/api/ops/alerts/events`
- `/api/price-alerts/evaluate`
- `/api/price-alerts/events`
- `/api/price-alerts/history`

SV Booking does not process bookings directly. Checkout happens on the selected provider site when a validated provider link is available.

Commercial/legal readiness remains incomplete until partner terms, affiliate/legal review, and licensed content display signoff are captured.

## Production Configuration

Copy `.env.example` to the deployment environment and configure real values. Do not commit secret values.

Go-live blockers:

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
- At least one partner pricing provider env from `RAPIDAPI_KEY`, `SERPAPI_KEY`, `MAKCORPS_API_KEY`, `AMADEUS_CLIENT_ID` plus `AMADEUS_CLIENT_SECRET`

Optional but important production env:

- Review provider readiness env after licensing is approved
- Price-alert webhook and unsubscribe env
- Ops-alert webhook env
- Push notification env
- Ticketmaster/OpenTripMap enrichment env
- Browser admin dashboard allowlist via `ADMIN_USER_IDS` and/or `ADMIN_EMAILS`

`npm run audit:production:strict` is the go-live gate. It is expected to fail in an unconfigured local shell.

## Development Commands

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm run lint
npm test
npm run test:coverage
npm run audit:coverage
npm run build
npm run test:e2e
npm run audit:guardrails
npm run audit:provenance
npm run audit:deployment-smoke
npm run audit:catalog
npm run audit:docs
npm run audit:master-plan
npm run audit:env
npm run audit:secrets
npm run audit:runtime
npm run audit:external-fetches
npm run audit:public-api-urls
npm run audit:affiliate-security
npm run audit:legal-readiness
npm run audit:security-responses
npm run audit:api-errors
npm run audit:cron-cache
npm run audit:ops
npm run audit:rum
npm run audit:release-deletions
npm run audit:production
npm run release:state
```

Run every `npm run audit:*` script before release. `npm audit --audit-level=moderate` contacts the npm registry and sends dependency metadata; run it only in an environment where that disclosure is approved.
Run `npm run release:state:strict` after staging or committing intended changes; it fails while the worktree still has uncommitted or untracked paths.
After deployment, run `SITE_URL=https://your-deployment.example npm run smoke:deployment`; add `ADMIN_API_SECRET` for authenticated admin smoke checks and set `SMOKE_RUN_CRON=1` with `CRON_SECRET` only when you intentionally want the cron route executed.

## Data Rules

- Never use `Math.random()` in application, scripts, or tests.
- Do not use generated hotel, review, provider, price, urgency, or availability claims.
- Unknown data must be represented as unavailable or not configured.
- IDs must be deterministic; use `lib/utils/hashId.ts` for content-derived IDs.
- Direct product `localStorage` access is blocked outside the centralized storage helper.
- External `fetch` calls must use the timeout helper and must degrade to unavailable states instead of invented data.
- Public API JSON responses must not expose unsafe absolute URLs, including non-HTTPS, credentialed, localhost, private-network, `javascript:`, or `data:` URLs.
- Outbound provider redirects must be HTTPS URLs on the provider allowlist; invalid URLs must fail closed.
- Shared security responses must use `Cache-Control: no-store`; throttled responses must include retry metadata.
- API error responses must use `Cache-Control: no-store`.
- Cron-protected agent responses must use `Cache-Control: no-store`.

## Release Notes For Maintainers

- The current repository should remain clean before release. Review `git status --short` and `git diff --stat` before staging new work.
- `npm run release:state` summarizes staged, unstaged, deleted, untracked, and generated-artifact paths for release review.
- `npm run audit:release-deletions` keeps removed no-fake-data legacy surfaces from returning.
- `npm run audit:provenance` keeps catalog candidate provenance, provider-link sanitization, and deployment smoke wiring from regressing.
- `npm run audit:deployment-smoke` keeps the deployment smoke script, docs, and CI wiring aligned.
- `npm run audit:master-plan` keeps checked roadmap items, open launch tasks, and honest DONE/PARTIAL/NOT DONE status ledgers synchronized.
- `npm run audit:external-fetches` blocks direct external `fetch("https://...")` calls that bypass timeout handling and requires shared public-URL sanitization for content, provider-link, event-link, and enrichment helpers.
- `npm run audit:public-api-urls` keeps the Playwright public API URL safety runtime audit wired into CI and release docs.
- `npm run audit:affiliate-security` blocks unsafe outbound redirect and affiliate URL regressions.
- `npm run audit:legal-readiness` blocks removal of privacy, terms, cookie, affiliate, and provider-handoff disclosures while external legal/partner signoff remains a launch blocker.
- `npm run audit:security-responses` blocks cacheable shared auth, validation, and rate-limit responses.
- `npm run audit:api-errors` blocks cacheable API error responses.
- `npm run audit:cron-cache` blocks cacheable cron/agent responses.
- Keep docs synchronized with `app/api`, `lib/hotels-catalog.js`, `.env.example`, and `package.json` scripts.
- The docs audit blocks stale claims about removed listing/booking API routes and old database architecture.
