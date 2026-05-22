# SV Booking Audit Report

**Audit date:** 2026-05-16
**Project:** `/Users/tal/my-app`
**Current local catalog:** 133 hotels, 46 cities, 32 countries
**Overall status:** locally stable, not production-ready until real deployment env is configured

## Executive Summary

The stabilization pass moved SV Booking from locally healthy but documentation-stale to a more release-ready state. The app now has current docs, a CI-wired documentation drift audit, one additional validated catalog hotel, quieter build/E2E output, and a deterministic E2E trust-state check for unavailable property amenities.

The remaining blockers are not code placeholders to fill in locally:

- `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis env, Kinde env, and at least one complete paid/partner pricing provider env group must be configured in deployment.
- `npm audit` must run only in an approved environment because it sends dependency metadata to the npm registry.
- Licensed review/property-content providers are still unavailable, so the app must continue showing unavailable states.
- The worktree is broad and must be reviewed before staging, committing, or deploying.

## Verified Evidence

| Check | Result | Evidence |
| --- | ---: | --- |
| `npm run lint` | PASS | ESLint completed with no reported errors. |
| `npm test` | PASS | 77 test files, 351 tests passed. |
| `npm run build` | PASS | Next.js 16.2.6 compiled and generated 129 static pages without the previous Edge-runtime static-generation warning. |
| `npm run test:e2e` | PASS | 48 Playwright tests passed. |
| `npm run audit:guardrails` | PASS | Forbidden randomness and unsupported product-claim guardrails passed. |
| `npm run audit:catalog` | PASS | Catalog audit passed: 133 hotels, 46 cities, 32 countries. |
| `npm run audit:docs` | PASS | Documentation audit passed and verifies current catalog counts plus stale-claim blockers. |
| `npm run audit:env` | PASS | Environment contract audit verifies `.env.example`, README, runbook, package scripts, and CI stay aligned with production readiness env groups. |
| `npm run audit:secrets` | PASS | Secret hygiene audit keeps `.env.example` empty-valued, env files ignored, CI free of secret contexts, and package scripts free of production env assignments. |
| `npm run audit:runtime` | PASS | Runtime warning audit blocks Edge Runtime reintroduction and Playwright color/env warning regressions. |
| `npm run audit:external-fetches` | PASS | External fetch audit blocks direct `fetch("https://...")` calls, requires the shared timeout helper for network probes, and covers Wikidata SPARQL hardening. |
| `npm run audit:affiliate-security` | PASS | Affiliate security audit blocks HTTP provider redirects and invalid URL tracking fallbacks. |
| `npm run audit:security-responses` | PASS | Shared auth, validation, and rate-limit helpers must return no-store responses, expose retry metadata, use timing-safe admin token checks, and normalize client IPs before quota keys are built. |
| `npm run audit:csrf` | PASS | CSRF audit now covers browser mutation routes, Fetch Metadata, Origin/Referer checks, and HTTP(S)-only origin normalization. |
| `npm run audit:api-errors` | PASS | API error cache audit blocks direct error responses without `Cache-Control: no-store`. |
| `npm run audit:cron-cache` | PASS | Cron cache audit blocks cacheable responses from cron-protected agent routes and requires timing-safe cron bearer token checks. |
| `npm run audit:ops` | PASS | Ops readiness audit passed and verifies CI/audit wiring. |
| `npm run audit:pwa` | PASS | PWA audit verifies offline shell readiness and service-worker bypass rules for API, non-GET, and private navigation routes. |
| Remaining non-strict `npm run audit:*` scripts | PASS | Agents, duplicates, providers, reviews, release deletions, i18n, price accuracy, PWA, ops scorecard, UI quality, accessibility, SEO, HTML safety, CSRF, storage, data retention, privacy, alerts, and production non-strict audits passed; privacy audit now covers fingerprint-only admin audit actors and alert audits cover webhook URL hardening. |
| `npm run audit:production` | PASS with blockers | Reports missing required deployment env names only; does not print secret values. |
| `npm run audit:production:strict` | EXPECTED FAIL locally | Blocks go-live because required admin/cron/Redis/Kinde env and a complete partner pricing provider env group are missing. |
| `npm run release:state` | PASS with blockers | Reports 376 changed paths: 227 tracked unstaged, 0 staged, 149 untracked, 5 deleted tracked paths, and 0 generated artifact paths. |
| `npm ls postcss --all` | PASS | Installed tree resolves to `postcss@8.5.14`. |
| `git diff --check` | PASS | No whitespace errors. |
| Local dependency vulnerability audit | BLOCKED | `npm audit --json` failed without network and escalation was rejected because it discloses dependency metadata externally. |

## Current Scores

| Domain | Score | Notes |
| --- | ---: | --- |
| Determinism / no fabricated data | 10/10 | Randomness guardrails pass; unknown data remains unavailable. |
| Build/test health | 10/10 | Lint, unit/API tests, build, and E2E pass. |
| Security guardrails | 9/10 | Admin auth, CSRF, HTML safety, privacy, storage, alert, and no-store checks are wired. |
| Documentation integrity | 9/10 | README, master plan, audit report, CI, and docs audit now agree on current architecture/counts. |
| Catalog scale | 6/10 | 133 curated hotels is valid for MVP verification, still far from market-scale coverage. |
| Provider readiness | 6/10 | Adapter infrastructure exists; real production provider credentials are missing locally. |
| Reviews/property content | 5/10 | APIs and UI correctly show unavailable states until licensed provider data exists. |
| Production readiness | 5/10 | Strict readiness correctly fails until deployment env is configured. |
| Release hygiene | 5/10 | Broad dirty worktree remains; needs human review before staging/commit/deploy. |

**Overall engineering score:** 8.6/10
**Go-live readiness:** 5/10 until strict production readiness passes in deployment

## Changes Completed In This Stabilization Pass

- Rewrote `README.md` and `MASTER-PLAN.md` to describe the current Next.js 16 App Router app, real APIs, Kinde auth, Upstash/KV model, provider model, and no-fabricated-data policy.
- Added `npm run audit:docs`, `scripts/audit-docs.mjs`, and unit coverage for stale documentation claims.
- Wired the docs audit into GitHub Actions and `audit:ops`.
- Promoted one already validated local catalog candidate, bringing the catalog to 133 hotels.
- Updated app copy and catalog/health floors to the current 133-hotel catalog.
- Removed the explicit Edge runtime export from the OG image route, eliminating the build warning about Edge runtime disabling static generation.
- Updated Playwright execution to avoid color-env warning noise.
- Changed local-storage helpers to access `window.localStorage` only in the browser, avoiding Node server-side Web Storage warnings.
- Stabilized hotel-detail E2E trust-state coverage by mocking the amenity unavailable response instead of waiting on an external OSM lookup.
- Added `npm run release:state` and `npm run release:state:strict` so release hygiene is machine-readable and strict release checks fail while the worktree is dirty.
- Excluded local `.playwright-mcp/` artifacts from release state and made deleted tracked paths explicit in the release-state report.
- Split release-state reporting into tracked, staged, unstaged, deleted, untracked, and generated-artifact counts so commit review can be sequenced.
- Added `npm run audit:release-deletions` to keep removed static flight estimates, guarantee copy, provider trust scores, local review form, and heatmap-estimate fallback from returning.
- Wired `npm run release:state:strict` into CI so clean checkouts fail if verification creates untracked or unstaged release artifacts.
- Aligned health readiness and ops scorecard with strict production readiness: Kinde env and a complete partner pricing provider env group are now explicit blockers.
- Extracted production readiness env grouping into `lib/production-readiness.mjs` so the CLI audit, health snapshot, and ops scorecard share one contract.
- Added `npm run audit:env` so readiness env names cannot drift across `.env.example`, README, runbook, package scripts, and CI.
- Added `npm run audit:secrets` to block committed env values and accidental production env assignments in scripts or CI.
- Added `npm run audit:runtime` to prevent Edge Runtime static-generation regressions and Playwright env warning regressions.
- Added `npm run audit:external-fetches` plus a shared fetch timeout helper so external probes cannot bypass abort handling.
- Hardened the Wikidata discovery client with shared request timeouts, no-store external fetches, escaped SPARQL string literals, bounded `LIMIT` values, and regression tests for query injection resistance.
- Added `npm run audit:affiliate-security` and hardened outbound provider redirects to HTTPS allowlisted URLs only.
- Added `npm run audit:security-responses` so shared admin-auth, validation, and rate-limit helpers cannot regress to cacheable security/error responses.
- Hardened rate-limit client identity extraction so invalid forwarded IP headers, `unknown` values, IPv4 ports, bracketed IPv6 addresses, and Cloudflare IP headers are normalized before quota keys are built.
- Hardened admin audit events so non-static actors are stored as deterministic fingerprints, client identifiers are normalized before fingerprinting, and sensitive string values are redacted even when the field name is not sensitive.
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

## Residual Risks

| Risk | Severity | Current state | Required action |
| --- | ---: | --- | --- |
| Missing production secrets | High | Strict readiness fails locally. | Configure real admin, cron, Upstash, Kinde, and provider env in deployment. |
| No complete partner pricing provider configured | High | Xotelo baseline may work, but production scale needs a complete partner provider env group. | Configure one approved provider group, such as `SERPAPI_KEY` or both Amadeus env values. |
| Dependency audit not completed here | Medium | External audit blocked by policy. | Run `npm audit` in an environment approved to disclose dependency metadata. |
| Licensed reviews unavailable | High | App correctly shows unavailable review/property content. | Integrate a licensed review/property-content source before displaying review claims. |
| Inventory scale | High | 133 hotels is not market-scale. | Continue validated candidate ingestion and admin approval toward a much larger catalog. |
| Broad dirty worktree | Medium | Many pre-existing modified/untracked files remain. | Review `git status --short` and split/stage intentionally before release. |
| Tracked deletions require final approval | Medium | `release:state` lists `FlightEstimate`, `PriceGuarantee`, `ProviderTrustScore`, `UserReviewForm`, and `heatmap-provider` deletions; `audit:release-deletions` blocks their return. | Confirm these removals in the release review before commit. |

## Release Gate

Do not go live until all of these are true:

- `npm run audit:production:strict` passes in deployment.
- `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` pass.
- Every non-strict `npm run audit:*` script passes.
- `npm audit` has passed in an approved environment.
- The dirty worktree has been reviewed and committed intentionally.
- `Math.random()` remains forbidden everywhere in code.
- No fake hotel, review, price, provider, urgency, availability, or production-readiness data has been added.
