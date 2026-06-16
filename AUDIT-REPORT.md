# SV Booking Audit Report

**Audit date:** 2026-06-06
**Project:** `/Users/tal/my-app`
**Current local catalog:** 502 hotels, 139 cities, 65 countries
**Overall status:** locally stable, not production-ready until real deployment env is configured

## Executive Summary

The stabilization pass moved SV Booking from locally healthy but documentation-stale to a more release-ready state. The app now has current docs, a CI-wired documentation drift audit, a 502-hotel catalog, deterministic cache jitter, clean local release state, deterministic E2E trust-state checks for unavailable property amenities, and a 100% `lib` coverage ratchet across lines, statements, functions, and branches.

The remaining blockers are not code placeholders to fill in locally:

- `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis env, Kinde env, and at least one complete paid/partner pricing provider env group must be configured in deployment.
- Licensed review/property-content providers are still unavailable, so the app must continue showing unavailable states.
- The worktree is clean; keep it clean before staging, committing, or deploying new work.

## Verified Evidence

| Check | Result | Evidence |
| --- | ---: | --- |
| `npm run lint` | PASS | ESLint completed with no reported errors. |
| `npm test` | PASS | 196 test files, 1181 tests passed. |
| `npm run test:coverage` | PASS | Coverage command runs with `@vitest/coverage-v8`; current `lib` coverage is 100% lines, 100% statements, 100% functions, and 100% branches. |
| `npm run audit:coverage` | PASS | Coverage ratchet prevents regression below the current floors: lines 100%, statements 100%, functions 100%, branches 100%. |
| `npm run build` | PASS | Next.js 16.2.6 compiled and generated 729 static pages without the previous Edge-runtime static-generation warning. |
| `npm run test:e2e` | PASS | 78 Playwright tests passed. |
| `npm run audit:guardrails` | PASS | Forbidden randomness and unsupported product-claim guardrails passed. |
| `npm run audit:catalog` | PASS | Catalog audit passed: 502 hotels, 139 cities, 65 countries. |
| `npm run audit:docs` | PASS | Documentation audit passed and verifies current catalog counts plus stale-claim blockers. |
| `npm run audit:master-plan` | PASS | Master-plan honesty audit keeps checked tasks, open launch tasks, and DONE/PARTIAL/NOT DONE ledgers synchronized. |
| `npm run audit:env` | PASS | Environment contract audit verifies `.env.example`, README, runbook, package scripts, and CI stay aligned with production readiness env groups. |
| `npm run audit:secrets` | PASS | Secret hygiene audit keeps `.env.example` empty-valued, env files ignored, CI free of secret contexts, and package scripts free of production env assignments. |
| `npm run audit:runtime` | PASS | Runtime warning audit blocks Edge Runtime reintroduction and Playwright color/env warning regressions. |
| `npm run audit:external-fetches` | PASS | External fetch audit blocks direct `fetch("https://...")` calls, requires the shared timeout helper for network probes, covers Wikidata SPARQL hardening, and requires shared public-URL sanitization for content, provider-link, event-link, and enrichment helpers. |
| `npm run audit:public-api-urls` | PASS | Public API URL safety audit keeps the runtime JSON URL scanner wired into package scripts, CI, README, and the production runbook. |
| `npm run audit:public-data-contracts` | PASS | Public data contract audit keeps source/dataPolicy/unavailable contracts wired for public price, destination, weather, exchange-rate, holiday, city-info, event, POI, guide, review, and property-content responses. |
| `npm run audit:affiliate-security` | PASS | Affiliate security audit blocks HTTP provider redirects and invalid URL tracking fallbacks. |
| `npm run audit:legal-readiness` | PASS | Legal readiness audit keeps privacy, terms, cookie, affiliate, and provider-handoff disclosures wired while external signoff remains a launch blocker. |
| `npm run audit:security-responses` | PASS | Shared auth, validation, and rate-limit helpers must return no-store responses, expose retry metadata, use timing-safe admin token checks, and normalize client IPs before quota keys are built. |
| `npm run audit:csrf` | PASS | CSRF audit now covers browser mutation routes, Fetch Metadata, Origin/Referer checks, and HTTP(S)-only origin normalization. |
| `npm run audit:api-errors` | PASS | API error cache audit blocks direct error responses without `Cache-Control: no-store`. |
| `npm run audit:cron-cache` | PASS | Cron cache audit blocks cacheable responses from cron-protected agent routes and requires timing-safe cron bearer token checks. |
| `npm run audit:ops` | PASS | Ops readiness audit passed and verifies CI/audit wiring. |
| `npm run audit:pwa` | PASS | PWA audit verifies offline shell readiness and service-worker bypass rules for API, non-GET, and private navigation routes. |
| `npm run audit:rum` | PASS | RUM audit verifies Vercel Analytics, Speed Insights, and local Core Web Vitals instrumentation are wired. |
| Remaining non-strict `npm run audit:*` scripts | PASS | Agents, duplicates, providers, reviews, release deletions, i18n, price accuracy, PWA, RUM, ops scorecard, UI quality, accessibility, SEO, HTML safety, CSRF, storage, data retention, privacy, alerts, legal readiness, and production non-strict audits passed; privacy audit now covers fingerprint-only admin audit actors and alert audits cover webhook URL hardening. |
| `npm run audit:production` | PASS with blockers | Reports missing required deployment env names and catalog media blockers; does not print secret values. |
| `npm run audit:production:strict` | EXPECTED FAIL locally | Blocks go-live because required admin/cron/Redis/Kinde env, a complete partner pricing provider env group, approved catalog media quality, licensed reviews, alert delivery, ops delivery, and push keys are missing. |
| `npm run release:state` | PASS | Reports a clean worktree with 0 changed paths. |
| `npm ls postcss --all` | PASS | Installed tree resolves to `postcss@8.5.14`. |
| `git diff --check` | PASS | No whitespace errors. |
| `npm audit --audit-level=moderate` | PASS | Approved network audit reported 0 dependency vulnerabilities. |

## Current Scores

| Domain | Score | Notes |
| --- | ---: | --- |
| Determinism / no fabricated data | 9/10 | Randomness guardrails pass; unknown data remains unavailable, but this is not yet a formal provenance proof for every future data path. |
| Build/test health | 10/10 | Lint, unit/API tests, build, and E2E pass. |
| Security guardrails | 8/10 | Admin auth, CSRF, HTML safety, privacy, storage, alert, and no-store checks are wired; production enforcement still needs real env and deployment verification. |
| Documentation integrity | 9/10 | README, master plan, audit report, CI, and docs audit now agree on current architecture/counts. |
| Coverage depth | 10/10 | Coverage tooling runs and now enforces 100% `lib` coverage across lines, statements, functions, and branches. |
| Catalog scale | 6/10 | 502 curated hotels clears the local launch floor, but it is not market-scale and reused imagery warnings remain. |
| Provider readiness | 5/10 | Adapter infrastructure exists; real production provider credentials are missing locally. |
| Reviews/property content | 4/10 | APIs and UI correctly show unavailable states until licensed provider data exists; rich content is not live. |
| Production readiness | 4/10 | Strict readiness correctly fails until deployment env and approved catalog media quality are configured. |
| Release hygiene | 10/10 | Worktree is clean; keep release-state strict before deployment. |

**Overall engineering score:** 8.5/10
**Go-live readiness:** 4/10 until strict production readiness passes in deployment with approved catalog media

## Changes Completed In This Stabilization Pass

- Rewrote `README.md` and `MASTER-PLAN.md` to describe the current Next.js 16 App Router app, real APIs, Kinde auth, Upstash/KV model, provider model, and no-fabricated-data policy.
- Added `npm run audit:docs`, `scripts/audit-docs.mjs`, and unit coverage for stale documentation claims.
- Added `npm run audit:master-plan` and a checked-task re-audit ledger so roadmap checkboxes cannot drift away from evidence and open launch blockers.
- Wired the docs audit into GitHub Actions and `audit:ops`.
- Expanded and validated the local catalog to 502 hotels across 139 cities and 65 countries.
- Updated app copy and catalog/health floors to the current 502-hotel catalog.
- Removed the explicit Edge runtime export from the OG image route, eliminating the build warning about Edge runtime disabling static generation.
- Updated Playwright execution to avoid color-env warning noise.
- Changed local-storage helpers to access `window.localStorage` only in the browser, avoiding Node server-side Web Storage warnings.
- Stabilized hotel-detail E2E trust-state coverage by mocking the amenity unavailable response instead of waiting on an external OSM lookup.
- Added `npm run release:state` and `npm run release:state:strict` so release hygiene is machine-readable and strict release checks fail while the worktree is dirty.
- Excluded local `.playwright-mcp/` artifacts from release state and made deleted tracked paths explicit in the release-state report.
- Split release-state reporting into tracked, staged, unstaged, deleted, untracked, and generated-artifact counts so commit review can be sequenced.
- Added `npm run audit:release-deletions` to keep removed static flight estimates, guarantee copy, provider trust scores, local review form, and heatmap-estimate fallback from returning.
- Wired `npm run release:state:strict` into CI so clean checkouts fail if verification creates untracked or unstaged release artifacts.
- Aligned health readiness and ops scorecard with strict production readiness: admin and cron secrets, Kinde, durable cache, partner pricing, approved catalog media, licensed reviews, alert delivery, unsubscribe, ops delivery, and push keys are now explicit launch blockers.
- Aligned strict production readiness with catalog media quality so unresolved reused/unapproved catalog images block go-live instead of remaining only a warning.
- Aligned strict production readiness with licensed review/provider env, price-alert delivery, ops-alert delivery, unsubscribe, and push-key requirements so launch services cannot silently remain unavailable.
- Aligned runtime readiness checks for reviews, alert webhooks, unsubscribe tokens, and push keys with strict env validation so placeholder hosts, short secrets, unsupported review providers, and missing Google Places keys cannot produce configured states.
- Extracted strict env validation into `lib/env-config.mjs` so runtime health, alerts, reviews, and PWA readiness can share the same validation contract without importing the full production-readiness/media gate.
- Extracted launch service readiness into `lib/launch-services.mjs` so strict readiness, runtime health, review provider configuration, and the ops scorecard share one contract for reviews, alerts, unsubscribe, ops alerts, and push keys.
- Kept production readiness env/media gating in `lib/production-readiness.mjs` while health and scorecard consume the shared env and launch-service contracts without importing the full strict audit gate.
- Added `npm run audit:env` so readiness env names cannot drift across `.env.example`, README, runbook, package scripts, and CI.
- Added `npm run audit:public-data-contracts` so public data routes keep explicit source, dataPolicy, unavailable, and verified-state contracts instead of implying unavailable upstreams were used.
- Extended public data contracts across weather, exchange-rate, holiday, and city-info endpoints so direct public data routes expose source/sourceStatus/dataPolicy and preserve zero-coordinate weather lookups.
- Added `npm run audit:secrets` to block committed env values and accidental production env assignments in scripts or CI.
- Added `npm run audit:runtime` to prevent Edge Runtime static-generation regressions and Playwright env warning regressions.
- Added `npm run audit:external-fetches` plus a shared fetch timeout helper so external probes cannot bypass abort handling.
- Hardened the Wikidata discovery client with shared request timeouts, no-store external fetches, escaped SPARQL string literals, bounded `LIMIT` values, and regression tests for query injection resistance.
- Added `npm run audit:affiliate-security` and hardened outbound provider redirects to HTTPS allowlisted URLs only.
- Added `npm run audit:legal-readiness` so privacy, terms, cookie consent, affiliate safety, provider-handoff notices, release docs, and CI wiring cannot be removed without failing verification.
- Added `npm run audit:security-responses` so shared admin-auth, validation, and rate-limit helpers cannot regress to cacheable security/error responses.
- Hardened rate-limit client identity extraction so invalid forwarded IP headers, `unknown` values, IPv4 ports, bracketed IPv6 addresses, and Cloudflare IP headers are normalized before quota keys are built.
- Hardened admin audit events so non-static actors are stored as deterministic fingerprints, client identifiers are normalized before fingerprinting, and sensitive string values are redacted even when the field name is not sensitive.
- Hardened proxy request correlation IDs to use deterministic hashed request attributes instead of runtime UUID randomness.
- Hardened price-alert and ops-alert webhook URL validation with a shared helper that rejects embedded URL credentials, blocks non-localhost HTTP, and allows localhost HTTP only outside production.
- Hardened webhook URL validation against SSRF-prone local, private, carrier-grade NAT, link-local, benchmark, IPv6 loopback, IPv6 ULA, IPv6 link-local, and IPv4-mapped IPv6 destinations even when HTTPS is used.
- Hardened the public price-alert unsubscribe endpoint with fail-closed rate limiting and timing-safe stored-token comparison to reduce token probing risk.
- Hardened authenticated price-alert mutations with fail-closed rate limiting before KV writes to reduce repeated alert creation/cancellation abuse.
- Hardened authenticated price-alert history reads with fail-closed rate limiting before scanning the shared alert event ledger.
- Hardened user-owned favorites, trips, and preference mutations with fail-closed rate limiting before KV writes to reduce authenticated write abuse.
- Hardened account data export and deletion with fail-closed rate limiting before privacy dataset reads or destructive KV deletes.
- Hardened production readiness env checks so placeholder values, short secrets/tokens/keys, non-HTTPS URLs, and URL credentials do not satisfy go-live readiness.
- Hardened admin bearer token verification with timing-safe comparison for `ADMIN_API_SECRET` and `CRON_SECRET` fallback checks.
- Hardened cron bearer token verification with timing-safe comparison for `CRON_SECRET` across automated agent and scheduled alert routes.
- Hardened the service worker so it bypasses non-GET requests, API routes, and private navigation routes instead of intercepting or offline-fallbacking protected surfaces.
- Hardened public mutation routes (`/api/click`, `/api/price-accuracy`, and `/api/agents/recommendations`) with same-origin enforcement and regression coverage.
- Hardened admin mutation routes (`/api/agents/providers`, `/api/agents/discovered`, `/api/catalog/validate`, and `/api/catalog/candidates`) with same-origin enforcement before provider resets, validation calls, or catalog candidate writes.
- Hardened the shared same-origin guard to reject cross-origin `Referer` headers when `Origin` is absent and to reject non-HTTP(S) origin protocols before mutation routes run.
- Added `npm run audit:api-errors` and marked direct API error responses as `no-store`.
- Added `npm run audit:cron-cache` and marked cron-protected agent responses as `no-store`.
- Repaired the broken `npm run test:coverage` command by adding the matching `@vitest/coverage-v8` dev dependency.
- Added `npm run audit:coverage`, a CI-wired coverage ratchet, and regression tests for the coverage audit script.
- Fixed valid zero-coordinate handling in geo-distance and nearest-city helpers, then added coverage for geo, destinations, country metadata, exchange rates, auth session helpers, and dashboard suggestions.
- Fixed valid zero-coordinate handling in Overpass/OpenTripMap POI helpers, validated Nominatim hotel input, and added coverage for POI, weather, Nominatim, Ticketmaster, Wikipedia, OpenTripMap, and the static hotel database adapter.
- Hardened discovery/enrichment sources against fabricated fallback labels, unsafe SPARQL values, unbounded DBpedia limits, missing Nominatim names, and zero-coordinate Overpass hotel results; added coverage for Overpass, Xotelo discovery, Wikidata enrichment, DBpedia, and Wikivoyage parser edge cases.
- Hardened geolocation IP normalization before external provider lookup, added browser hook coverage for local storage/favorites/trips/recently viewed/history, and covered browser currency detection plus legacy currency migration.
- Hardened holiday date-range validation and country-name normalization, preserved provider-unavailable semantics, sanitized hotel popularity counters before KV writes/reads, and added coverage for those edge cases.
- Hardened dynamic hotel catalog ingestion so discovered entries require valid TripAdvisor-style keys, trimmed real text, bounded stars/coordinates, HTTPS source URLs, and safe object provenance before runtime or KV indexing.
- Hardened catalog candidate promotion so discovery agents can only queue candidates, while explicit admin approval is the only audited path that can persist a validated hotel into the catalog.
- Hardened Ticketmaster event ingestion so invalid coordinates never reach the provider, request radius and size are bounded, invalid date filters are omitted, incomplete events are dropped, and unsafe ticket URLs are not surfaced.
- Hardened the public events API route so malformed coordinates, out-of-range coordinates, invalid dates, and reversed date ranges are rejected before cache lookup, rate limiting, or provider access.
- Hardened Xotelo pricing and heatmap calls so invalid hotel keys, dates, currencies, and timeout budgets are rejected before provider requests, and retry waits only run when the timeout budget can cover them.
- Hardened price-cache rate normalization so unusable provider rates, non-positive totals, invalid currencies, blocked provider labels, and non-HTTPS provider links are removed before cached or cached-returned data is surfaced.
- Fixed the enrichment agent so Wikidata booking-slug results returned as a `Map` are actually persisted, and hardened Wikidata enrichment parsing to drop unsafe slugs, non-HTTPS URLs, malformed provider IDs, and out-of-range coordinates.
- Hardened ops provider alerts so provider-specific success-rate and latency alerts require enough events for that provider, and sanitized provider-derived alert IDs and display names.
- Hardened reusable provider-rate observations so public availability and recommendation surfaces only reuse HTTPS provider deep links and normalized three-letter currencies.
- Hardened direct cheaper-date helper calls so invalid dates, reversed stays, and missing hotel keys fail closed before cache/provider access.
- Hardened OpenTripMap helper calls so invalid coordinates fail closed before fetch, radius/limit/kinds are bounded, provider result coordinates are validated, and returned detail URLs are HTTPS-only.
- Added shared public URL sanitization for returned content/provider links, rejected URL credentials, localhost/private destinations, CGNAT, benchmark ranges, IPv6 ULA/link-local, and IPv4-mapped IPv6, moved Wikipedia, Wikivoyage, DBpedia, OpenTripMap, and price-cache URL normalization onto the shared helper, and expanded `audit:external-fetches` to enforce it.
- Hardened catalog candidate and dynamic catalog source URL handling so unsafe URLs are stripped before storage, cannot satisfy provenance checks, and cannot be promoted as catalog source links.
- Added a static catalog provenance ledger so every legacy catalog item exposes TripAdvisor/Xotelo identity metadata and every catalog image exposes source URL, host, and license-status metadata without pretending reused images are approved licensed replacements.
- Added QA-only Arabic, French, and Spanish locale coverage so `audit:i18n`, unit tests, and Playwright exercise RTL/LTR fallback behavior beyond English/Hebrew without claiming those translations are complete.
- Added deterministic catalog candidate review summaries for duplicate/provenance/location/source/city queues and surfaced them through the admin candidate APIs and agent dashboard.
- Added authenticated dashboard visibility for the ops scorecard, alert severity counts, domain status, top blockers, and global-parity blocked state.
- Added sourced competitor parity tracking for Booking.com, Google Travel, KAYAK/HotelsCombined, Expedia, trivago, Fattal, and Isrotel across inventory, freshness, mobile, reviews, alerts, booking handoff, and Israel coverage.
- Surfaced reused catalog media as a measurable ops scorecard blocker instead of leaving it only as a catalog audit warning.
- Raised provider observability, catalog media, URL-safety, reviews, i18n, REST Countries, DBpedia, candidate-review, webhook URL, Wikivoyage, Ticketmaster, cheaper-date, Xotelo, auth helper, cron-auth helper, price-cache, hotel-popularity, catalog fuzzy-search, ops-alert sorting, continent indexing, and webhook URL edge coverage, then moved the branch coverage ratchet floor to 100%.
- Raised remaining `lib` line, statement, and function coverage to 100% with focused timeout, provider-normalization, Redis fallback, Xotelo discovery, Wikidata, OpenTripMap, Ticketmaster, geolocation, and Google Places abort-path tests; the coverage ratchet now blocks regression below 100% in every tracked `lib` dimension.
- Added a CI-wired RUM audit for Vercel Analytics, Speed Insights, and local Core Web Vitals instrumentation while keeping production RUM proof as a launch blocker.
- Moved cheaper-date provider links, Ticketmaster event links, and Wikidata enrichment website/image links onto the shared public URL helper so internal/private URLs cannot leak through public API responses.
- Added a Playwright public API URL safety runtime audit for JSON responses and a CI-wired `npm run audit:public-api-urls` guard so unsafe absolute URLs cannot quietly return through public endpoints.
- Removed remaining local hook-dependency suppressions in hotel detail and side-by-side compare flows, and replaced CLS `any` casts in the performance monitor with a typed layout-shift entry.
- Localized the home search autocomplete labels and clear action through the existing dictionary.
- Added focused regression coverage for date parsing, fetch timeout failure paths, deterministic hash nullish inputs, property-content unknown hotels, and ops alert event sanitization.
- Raised branch coverage above 80% with focused KV, provider-observability, price-recommendation, price-cache, and local-storage edge-case tests.
- Raised discovery-source branch coverage with Xotelo provider failure/credential paths, Nominatim rate-limit/timeout paths, and Wikivoyage sourced parser edge cases.
- Raised branch coverage above 82% with holiday provider failure/default-year paths and Overpass POI fallback/error coverage.
- Raised branch coverage above 83% with REST Countries failure/default branches, admin audit failure/limit handling, KV eviction, and price-cache batch/coalescing/invalidation coverage.
- Raised branch coverage above 84% with agent status/history failure handling, i18n fallback formatting, ops-alert healthy-state coverage, and admin session allowlist normalization.
- Raised branch coverage above 88% with Overpass failure paths, provider registry diagnostics, i18n locale edges, ops alert thresholds, price-cache stale/fuzzy paths, provider accuracy ledgers, Ticketmaster/OpenTripMap branches, and URL/geo safety cases.
- Raised branch coverage above 90% with Wikidata chunking/failure paths, Google Places review normalization, catalog default-image indexing, provider uptime retention, candidate status locking, price-cache write/fallback failures, cheaper-date rates payloads, and production-like ops scorecard branches.
- Raised branch coverage above 92% with deterministic price-cache fallback/timestamp coverage, Xotelo malformed-payload paths, OpenTripMap safe fallback fields, rate-limit IP edge cases, and admin audit default/limit handling.
- Raised branch coverage above 94% with dynamic catalog KV ingestion, cheaper-date fallback/timeout behavior, catalog candidate normalization and deduplication, DBpedia/Wikivoyage sparse payload handling, KV Redis adapter coverage, webhook failure sanitization, geolocation IPv6 hardening, webhook URL edge cases, and provider uptime legacy-event coverage.
- Raised branch coverage above 96% with POI/weather/event sparse payload coverage, catalog-candidate nested ID and sparse merge coverage, user-data cleanup hardening, price-alert delivery failure coverage, review-provider fallback coverage, Xotelo retry/default coverage, cheaper-date malformed-tax coverage, and constrained ops-scorecard readiness coverage.
- Raised branch coverage to 97% with catalog durable-load edge cases, Overpass sparse-coordinate parsing, Nominatim sparse metadata handling, geo/IP fallback hardening, URL hostname edge coverage, ops warning-only alert status, strict admin-only auth separation, and cheaper-date heatmap bracket selection coverage.
- Raised branch coverage to 98% with admin-session auth failure coverage, price-recommendation currency fallbacks, sparse REST Countries/DBpedia payloads, invalid forwarded-origin metadata, geolocation IPv6 hardening, map-marker fallback gaps, ops alert delivery/event empty-state coverage, price-alert unsubscribe guards, and provider-observability label normalization.
- Raised branch coverage above 99% with health-readiness edge coverage, storage/currency browser fallbacks, provider coverage duplicate metrics, catalog candidate raw-KV handling, Wikipedia batching, Wikidata sparse payloads, cheaper-date zero-price heatmaps, Xotelo non-transient retry behavior, and catalog full-load fallback coverage.
- Added provenance and deployment-smoke audits plus a `SITE_URL`-driven deployment smoke script for post-deploy verification without fake data.
- Added provider coverage telemetry by observation date, provider, city, and country from verified `price:observations:*` records only; empty ledgers report `insufficient-data`.

## Residual Risks

| Risk | Severity | Current state | Required action |
| --- | ---: | --- | --- |
| Missing production secrets | High | Strict readiness fails locally. | Configure real admin, cron, Upstash, Kinde, and provider env in deployment. |
| No complete partner pricing provider configured | High | Xotelo baseline may work, but production scale needs a complete partner provider env group. | Configure one approved provider group, such as `SERPAPI_KEY` or both Amadeus env values. |
| Licensed reviews unavailable | High | App correctly shows unavailable review/property content. | Integrate a licensed review/property-content source before displaying review claims. |
| Inventory scale | Medium | 502 hotels clears the local floor but is not market-scale. | Continue validated candidate ingestion and admin approval toward a much larger catalog. |
| External observability proof | Medium | Authenticated dashboard now shows local ops scorecard and alerts, and RUM wiring is audited; external monitoring, production RUM evidence, and webhook evidence are still absent. | Configure production monitoring, RUM, and alert delivery after real env is available. |
| Commercial/legal signoff | Medium | Legal readiness wiring is audited locally, but it is not legal approval. | Capture partner terms, affiliate/legal review, and licensed content display signoff before launch claims depend on provider programs or licensed content. |
| Reused catalog imagery | Low | `audit:catalog` passes but warns about reused Unsplash images across cities; the ops scorecard also reports image sources that still need approved license metadata or replacement. | Replace reused media with licensed, city- or hotel-specific images as provenance is approved. |
| Clean worktree discipline | Medium | Worktree is clean. | Keep `npm run release:state:strict` passing before release. |

## Release Gate

Do not go live until all of these are true:

- `npm run audit:production:strict` passes in deployment.
- `npm run lint`, `npm test`, `npm run test:coverage`, `npm run build`, and `npm run test:e2e` pass.
- `npm run audit:coverage` passes.
- Every non-strict `npm run audit:*` script passes.
- `npm audit --audit-level=moderate` has passed in an approved environment.
- The worktree is clean and `npm run release:state:strict` passes.
- `Math.random()` remains forbidden everywhere in code.
- No fake hotel, review, price, provider, urgency, availability, or production-readiness data has been added.
