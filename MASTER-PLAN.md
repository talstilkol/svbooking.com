# SV Booking Production Stabilization Plan

## Current State

The app is locally healthy but not production-ready until real deployment configuration is present.

| Area | Score | Current status |
| --- | ---: | --- |
| Determinism and no-fabrication guardrails | 9/10 | `Math.random()` and unapproved UUID randomness are blocked by scans/audits; this is still not a formal proof that every future data path has complete provenance. |
| Local build/test health | 10/10 | Lint, unit/API tests, build, and E2E are expected release gates. |
| Coverage depth | 9/10 | `npm run audit:coverage` now enforces a ratchet floor; current `lib` coverage is 99.1% lines and 96.16% branches. |
| Security guardrails | 8/10 | Admin bearer auth, CSRF checks, HTML-safety, storage, privacy, alert, public API URL safety, and no-store audits are wired; production enforcement still depends on real env and deployment verification. |
| Catalog quality | 6/10 | 502 curated hotels across 139 cities and 65 countries; clears the local floor, still far below market-scale coverage and has reused catalog imagery warnings. |
| Provider coverage | 5/10 | Six pricing adapters exist, but production needs real configured partner credentials beyond the no-auth baseline. |
| Reviews and property content | 4/10 | APIs return explicit unavailable states until licensed provider data is configured; rich review/property content is not live. |
| Mobile retention | 5/10 | PWA/offline shell and local alerts exist; push delivery env and provider are not configured. |
| Production readiness | 4/10 | Strict readiness fails without admin, cron, Redis, Kinde, and partner-provider env. |
| Release hygiene | 10/10 | The worktree is clean; keep generated/cache artifacts out of commits. |

## Accountability Audit

This section is the source of truth for what is complete versus only locally scaffolded.

| Plan item | Status | Honest verification |
| --- | --- | --- |
| Determinism: no `Math.random()` | DONE | `rg "Math\.random\|crypto\.randomUUID" app components lib scripts tests -S` returns no matches. |
| No-fabrication guardrails | PARTIAL | `npm run audit:guardrails` and `npm run audit:provenance` pass, but there is no exhaustive licensed-source proof for every legacy catalog item/image and future provider/content path. |
| Local lint/unit/build/E2E health | DONE | `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` passed locally. |
| Coverage ratchet current floor | DONE | `npm run audit:coverage` passes at 99.1% lines, 98.21% statements, 97.11% functions, 96.16% branches. |
| Coverage to world-class depth | PARTIAL | Branch coverage is above 96%, not near exhaustive; remaining weak areas include hotels-catalog, ops alerts, provider observability, Nominatim, public URL safety, health readiness, and remaining API error branches. |
| Security audits wired | DONE | CSRF, HTML safety, storage, privacy, alert, public URL, affiliate, no-store, API error, and cron-cache audits pass locally. |
| Production security enforcement | PARTIAL | Code gates exist, but real admin, cron, Kinde, Redis, provider, alert, and push env are not configured locally. |
| Catalog local floor | DONE | Catalog count is 502 hotels, 139 cities, 65 countries. |
| Catalog market scale | NOT DONE | The catalog is not comparable to large OTA/global metasearch inventory and still has reused imagery warnings. |
| Provider adapter layer | DONE | Six adapters are registered: Xotelo, SerpAPI, Booking/RapidAPI, TripAdvisor/RapidAPI, MakCorps, and Amadeus. |
| Production provider readiness | NOT DONE | No complete partner pricing provider env group is configured in local strict readiness. |
| Reviews unavailable state | DONE | Review/property APIs intentionally return unavailable states when provider licensing is missing. |
| Licensed review/property integration | NOT DONE | No licensed review/property-content provider is configured for production content. |
| PWA/offline shell | DONE | PWA audit passes and the runbook documents network-only API behavior. |
| Push/mobile notification delivery | NOT DONE | `NEXT_PUBLIC_PUSH_PUBLIC_KEY` and `PUSH_PRIVATE_KEY` are not configured with an approved provider. |
| Release hygiene | DONE | `npm run release:state:strict` passes after committed changes; worktree is clean at audit time. |
| Production env gate | NOT DONE | `npm run audit:production:strict` correctly fails locally on missing real env. |
| Docs drift prevention | DONE | `npm run audit:docs` passes and CI includes the docs audit. |
| README, `.env.example`, runbook, plan alignment | PARTIAL | Audits pass for key snippets and env names, but not every operational runbook instruction has a live deployment proof. |
| Public API unsafe URL prevention | DONE | `npm run audit:public-api-urls` passes and the Playwright JSON scanner is wired in CI. |
| Validated catalog candidate promotion | PARTIAL | Candidate and admin approval paths exist and provenance wiring is audited; production-scale ingestion with real reviewed approvals is not complete. |
| Licensed media replacement | NOT DONE | `audit:catalog` still warns about reused Unsplash images across cities. |
| Agent cron auth | DONE | Cron-protected routes and `CRON_SECRET` gate are wired and audited. |
| Production cron execution | NOT DONE | Cron routes are not verified in a real deployment with real `CRON_SECRET` and persistent KV. |
| Ops monitoring endpoints | PARTIAL | `/api/health`, `/api/ops/scorecard`, `/api/ops/alerts`, provider uptime, price accuracy, and alert history surfaces exist; real external monitoring and webhook delivery are not configured. |
| Dependency audit | DONE | `npm audit --audit-level=moderate` passed in an approved network environment. |
| `audit:production:strict` in deployment | NOT DONE | No deployment env proof has been provided. |
| No stale removed-route docs | DONE | `npm run audit:docs` rejects removed legacy route names, old database claims, and old catalog-size claims. |
| Unknown data shown explicitly | PARTIAL | Covered for many surfaces and audited, but requires continued enforcement as new integrations are added. |
| Faked work | DONE | No item is intentionally marked as completed by simulation only; local-only items are marked DONE only when verified by commands, and env/provider/launch items remain PARTIAL or NOT DONE. |

## Full Item-By-Item Audit

Legend: DONE means real, working, and locally verified. FAKED means simulated, echoed, or pretended. PARTIAL means started but incomplete. NOT DONE means not touched or not proved.

| Source | Item | Status | Evidence or gap |
| --- | --- | --- | --- |
| Current State | Determinism and no-fabrication guardrails | PARTIAL | Forbidden randomness scans pass, but end-to-end provenance is not exhaustive. |
| Current State | Local build/test health | DONE | Lint, unit/API, build, and E2E passed locally. |
| Current State | Coverage depth | PARTIAL | Ratchet passes at 96.16% branch coverage; next gap is 97%+ and exhaustive branch coverage in catalog, ops, provider observability, URL safety, network, and API error paths. |
| Current State | Security guardrails | PARTIAL | Local audits pass; production enforcement still requires real deployment env. |
| Current State | Catalog quality | PARTIAL | 502 hotels/139 cities/65 countries pass the floor; imagery reuse and market scale remain open. |
| Current State | Provider coverage | PARTIAL | Adapter layer exists; real partner credentials are not configured. |
| Current State | Reviews and property content | PARTIAL | Unavailable state is correct; licensed rich review/property data is not live. |
| Current State | Mobile retention | PARTIAL | PWA shell exists; push delivery is not configured. |
| Current State | Production readiness | NOT DONE | Strict production readiness fails locally due missing real env. |
| Current State | Release hygiene | DONE | Worktree was clean after the last release-state strict gate. |
| Accountability | Determinism: no `Math.random()` | DONE | Scan returned no `Math.random()` or unapproved UUID usage. |
| Accountability | No-fabrication guardrails | PARTIAL | Claims and provenance-wiring audits pass, but static legacy catalog/image provenance and future provider/content paths still need stronger licensed-source controls. |
| Accountability | Local lint/unit/build/E2E health | DONE | Verified by local gates. |
| Accountability | Coverage ratchet current floor | DONE | `npm run audit:coverage` passed at the current floor. |
| Accountability | Coverage to world-class depth | PARTIAL | Branch coverage is above 96%, still not near exhaustive. |
| Accountability | Security audits wired | DONE | Local security audit scripts pass. |
| Accountability | Production security enforcement | PARTIAL | Code gates exist; real deployment secrets and providers are absent. |
| Accountability | Catalog local floor | DONE | Catalog count is above the local floor. |
| Accountability | Catalog market scale | NOT DONE | Inventory is far below global OTA/metasearch scale. |
| Accountability | Provider adapter layer | DONE | Six adapters are registered. |
| Accountability | Production provider readiness | NOT DONE | No complete paid/partner provider env group is configured. |
| Accountability | Reviews unavailable state | DONE | Missing licensed review/provider data is surfaced as unavailable. |
| Accountability | Licensed review/property integration | NOT DONE | No licensed provider is configured. |
| Accountability | PWA/offline shell | DONE | PWA audit passes. |
| Accountability | Push/mobile notification delivery | NOT DONE | Push public/private keys and provider are not configured. |
| Accountability | Release hygiene | DONE | `release:state:strict` passed after committed changes. |
| Accountability | Production env gate | NOT DONE | `audit:production:strict` fails until real env exists. |
| Accountability | Docs drift prevention | DONE | `audit:docs` passes. |
| Accountability | README, `.env.example`, runbook, plan alignment | PARTIAL | Static docs align; live deployment runbook evidence is missing. |
| Accountability | Public API unsafe URL prevention | DONE | Public URL audit passes. |
| Accountability | Validated catalog candidate promotion | PARTIAL | Candidate flow and provenance guard audit exist; production-scale reviewed promotion is incomplete. |
| Accountability | Licensed media replacement | NOT DONE | Reused Unsplash imagery warnings remain. |
| Accountability | Agent cron auth | DONE | Cron auth gate is wired and audited. |
| Accountability | Production cron execution | NOT DONE | Not verified in deployment with real `CRON_SECRET` and persistent KV. |
| Accountability | Ops monitoring endpoints | PARTIAL | Endpoints exist; external monitoring/webhook delivery is not configured. |
| Accountability | Dependency audit | DONE | Approved network `npm audit` returned 0 vulnerabilities. |
| Accountability | `audit:production:strict` in deployment | NOT DONE | No deployment proof has been provided. |
| Accountability | No stale removed-route docs | DONE | Docs audit blocks stale route/architecture claims. |
| Accountability | Unknown data shown explicitly | PARTIAL | Covered for many surfaces; must be kept as integrations expand. |
| Accountability | Faked work | DONE | No completion was intentionally marked from simulation; inflated scoring was corrected downward. |
| Stabilization Priority | Configure real admin, cron, Redis, Kinde, and partner-provider env | NOT DONE | Requires real secrets and provider contracts outside the repo. |
| Stabilization Priority | Treat `audit:production:strict` as go-live blocker | DONE | Documented and enforced by the strict audit script. |
| Stabilization Priority | Review modified/deleted/untracked files before staging | DONE | Release-state strict was clean before commits. |
| Stabilization Priority | Split unrelated work into reviewable commits | DONE | Last work was split into two focused commits. |
| Stabilization Priority | Keep generated/cache artifacts out of commits | DONE | Release-state strict reported no generated artifacts. |
| Stabilization Priority | Raise branch coverage from 84.07% toward 85% | DONE | Current branch coverage is 96.16% and the floor is 96.1%. |
| Stabilization Priority | Prioritize remaining branch coverage hot spots | PARTIAL | Overpass, provider registry, i18n, ops alert, price-cache, provider accuracy, public URL, geolocation, discovery, Wikidata, Google Places reviews, catalog candidate locking, provider uptime, OpenTripMap, Xotelo, rate-limit, admin audit, ops scorecard, POI/weather/event sparse payloads, user-data cleanup, review fallback, and alert delivery branches were expanded; remaining hot spots include hotels-catalog, ops alerts, provider observability, Nominatim, public URL safety, health readiness, and remaining API error branches. |
| Stabilization Priority | Keep coverage reports out of commits | DONE | Coverage artifacts were not staged. |
| Stabilization Priority | Keep README, env example, runbook, and plan aligned | PARTIAL | Local docs audit passes; deployment runbook evidence is missing. |
| Stabilization Priority | Run docs audit in CI | DONE | `audit:docs` is wired in CI. |
| Stabilization Priority | Keep public URL and runtime JSON scanners enabled | DONE | `audit:public-api-urls` is wired and passes. |
| Stabilization Priority | Promote only validated catalog candidates | PARTIAL | Validation path exists; production approval process is not exercised at scale. |
| Stabilization Priority | Replace reused/stock-like catalog images | NOT DONE | Catalog audit still warns about reused city images. |
| Stabilization Priority | Add licensed reviews/property providers | NOT DONE | No licensed provider env is configured. |
| Stabilization Priority | Keep unknown data unavailable/not configured | PARTIAL | Local behavior exists; future integrations need continuous enforcement. |
| Stabilization Priority | Run agent cron routes only with `CRON_SECRET` | DONE | Cron auth checks are wired and audited. |
| Stabilization Priority | Monitor health, scorecard, alerts, uptime, price accuracy, alert delivery | PARTIAL | Local endpoints exist; external monitoring and webhook delivery are not configured. |
| Stabilization Priority | Keep dependency auditing in approved network env | DONE | `npm audit --audit-level=moderate` was run with network access and passed. |
| Acceptance Criteria | `npm run lint` passes | DONE | Passed locally. |
| Acceptance Criteria | `npm test` passes | DONE | 167 files / 1016 tests passed. |
| Acceptance Criteria | `npm run test:coverage` runs and trend is reviewed | DONE | Coverage was generated and reviewed; ratchet was raised. |
| Acceptance Criteria | `npm run audit:coverage` passes | DONE | Passed at 99.1% lines and 96.16% branches. |
| Acceptance Criteria | `npm run build` passes | DONE | Next.js build passed with 728 static pages. |
| Acceptance Criteria | `npm run test:e2e` passes | DONE | 72 Playwright tests passed. |
| Acceptance Criteria | Every non-strict `npm run audit:*` passes | DONE | All non-strict audit scripts passed locally. |
| Acceptance Criteria | `audit:production:strict` passes in deployment | NOT DONE | No deployment env proof exists. |
| Acceptance Criteria | `npm audit --audit-level=moderate` has no moderate vulnerabilities | DONE | Approved network audit reported 0 vulnerabilities. |
| Acceptance Criteria | README and plan contain current catalog count | DONE | Docs audit checks 502 hotels, 139 cities, 65 countries. |
| Acceptance Criteria | No removed-route or stale architecture docs | DONE | Docs audit blocks stale claims. |
| Backlog P0 | Configure real deployment env | NOT DONE | Requires real secrets. |
| Backlog P0 | Run strict production audit in deployment | NOT DONE | Requires configured deployment. |
| Backlog P0 | Verify deployed cron routes | NOT DONE | Requires deployed cron and real `CRON_SECRET`. |
| Backlog P0 | Configure persistent KV and verify health reports persistent cache | NOT DONE | Requires Upstash/deployment env. |
| Backlog P0 | Configure approved pricing partner and verify provider-returned rates | NOT DONE | Requires partner credentials. |
| Backlog P0 | Configure licensed review/property provider | NOT DONE | Requires licensed provider access. |
| Backlog P1 | Raise branch coverage from 83.26% toward 84% | DONE | Coverage ratchet has moved past this milestone. |
| Backlog P1 | Raise branch coverage from 84.07% toward 85% | DONE | Current branch coverage is 96.16%. |
| Backlog P1 | Raise branch coverage from 85.08% toward 88% | DONE | Current branch coverage is 96.16% and the floor is 96.1%. |
| Backlog P1 | Raise branch coverage from 88.14% toward 90% | DONE | Current branch coverage is 96.16% and the floor is 96.1%. |
| Backlog P1 | Raise branch coverage from 90.04% toward 92% | DONE | Current branch coverage is 96.16%; the ratchet floor is now 96.1%. |
| Backlog P1 | Add focused tests for remaining weak branches | PARTIAL | Focused network, provider, cache, i18n, ops, URL-safety, geolocation, discovery, Wikidata, Google Places reviews, catalog candidate locking, provider uptime, OpenTripMap, Xotelo, rate-limit, admin audit, ops scorecard, dynamic catalog, cheaper-date fallback, catalog candidates, KV adapter, webhook, DBpedia/Wikivoyage, POI/weather/event sparse payloads, user-data cleanup, review fallback, and alert delivery tests were added; hotels-catalog, ops alerts, provider observability, Nominatim, public URL safety, health readiness, and remaining API error branches remain. |
| Backlog P1 | Replace reused catalog images | NOT DONE | Image reuse warnings remain. |
| Backlog P1 | Add stronger provenance audit | PARTIAL | `audit:provenance` now checks candidate promotion provenance and provider-link sanitization; it does not yet prove every legacy static catalog item/image has licensed source metadata. |
| Backlog P1 | Add deployment smoke checks | PARTIAL | `smoke:deployment` now exists for public, admin, cron-guard, and unavailable-state checks; it has not been run against a configured deployment. |
| Backlog P2 | Expand catalog through admin candidate workflow only | PARTIAL | Workflow exists; scale expansion is not complete. |
| Backlog P2 | Add duplicate/provenance review dashboards | PARTIAL | Duplicate flags exist; full dashboard workflow is incomplete. |
| Backlog P2 | Add provider coverage telemetry by city/country/date | DONE | `/api/agents/providers/coverage` and provider dashboard summary now derive coverage from verified `price:observations:*` records and return `insufficient-data` when there is no evidence. |
| Backlog P2 | Add real alert delivery provider integration | NOT DONE | Webhook/push/email provider is not configured. |
| Backlog P2 | Add web push after approved provider setup | NOT DONE | Push keys/provider are absent. |
| Backlog P3 | Production observability dashboard | PARTIAL | Scorecard/health APIs exist; full dashboard and external metrics are incomplete. |
| Backlog P3 | Real-user monitoring and Core Web Vitals | NOT DONE | No production RUM proof exists. |
| Backlog P3 | Localization QA beyond Hebrew/English | PARTIAL | Hebrew/English exist; broader RTL/LTR QA is incomplete. |
| Backlog P3 | Commercial/legal readiness | NOT DONE | Requires partner terms, affiliate/legal review, and licensed content signoff. |
| Backlog P3 | Competitor parity tracking | NOT DONE | Not implemented as an automated product/ops tracker. |
| Non-Negotiable | Never use `Math.random()` | DONE | Scan is clean. |
| Non-Negotiable | Never display fabricated hotel/review/price/provider/urgency/availability/readiness data | PARTIAL | Guardrails pass; exhaustive provenance proof remains open. |
| Non-Negotiable | Never use invented secrets | DONE | Strict readiness fails instead of accepting placeholders. |
| Non-Negotiable | Show missing provider/credential/license/source as unavailable | PARTIAL | Existing paths do this; every future integration must preserve it. |

## Stabilization Priorities

1. **Production env gate**
   - Configure real `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis env, Kinde env, and at least one partner pricing provider.
   - Treat `npm run audit:production:strict` as the go-live blocker.

2. **Release hygiene**
   - Review all modified, deleted, and untracked files before staging new work.
   - Split unrelated work into reviewable commits if the diff remains broad.
   - Keep generated/cache artifacts out of commits.

3. **Coverage ratchet**
   - Raise `lib` branch coverage from 96.16% toward 97%, then raise the ratchet floors again in `scripts/audit-coverage.mjs`.
   - Prioritize hotels-catalog, ops alerts, provider observability, Nominatim, public URL safety, health readiness, retention edge cases, and remaining API error branches.
   - Keep coverage reports out of commits unless a reviewed artifact is explicitly requested.

4. **Docs and drift prevention**
   - Keep `README.md`, `.env.example`, `PRODUCTION-RUNBOOK.md`, and this plan aligned with actual routes and scripts.
   - Run `npm run audit:docs` in CI so removed routes and stale architecture claims do not return.
   - Keep `npm run audit:public-api-urls` and the Playwright runtime JSON scanner enabled so unsafe absolute URLs cannot return through public APIs.

5. **Market readiness**
   - Promote only validated catalog candidates with real hotel keys and source provenance.
   - Replace reused stock-like catalog images with hotel- or city-specific licensed media as provenance becomes available.
   - Add licensed reviews and property-content provider integrations before displaying ratings or review copy.
   - Keep all unknown data as unavailable/not configured.

6. **Operations**
   - Run agent cron routes only with `CRON_SECRET`.
   - Monitor `/api/health`, `/api/ops/scorecard`, `/api/ops/alerts`, provider uptime, price-accuracy metrics, and alert delivery history.
   - Keep dependency auditing in an approved environment because `npm audit` sends dependency metadata to the npm registry.

## Acceptance Criteria

- `npm run lint` passes.
- `npm test` passes.
- `npm run test:coverage` runs successfully, with coverage trend reviewed before release.
- `npm run audit:coverage` passes and prevents coverage regression below the current floor.
- `npm run build` passes.
- `npm run test:e2e` passes.
- Every `npm run audit:*` script passes except `audit:production:strict` in intentionally unconfigured local shells.
- `npm run audit:production:strict` passes in the deployment environment before launch.
- `npm audit --audit-level=moderate` reports no dependency vulnerabilities in an approved network environment.
- README and plan contain the current catalog count: 502 hotels, 139 cities, 65 countries.
- No documentation references removed listing/booking API routes, old database architecture, old 15-hotel coverage, or unsupported no-auth/no-rate-limit claims.

## Execution Backlog To Complete The Whole Plan

### P0: Launch Blockers

- [ ] Configure real deployment env: `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis, Kinde, and at least one complete partner pricing provider group.
- [ ] Run `npm run audit:production:strict` in the deployment environment and capture the passing release evidence.
- [ ] Verify deployed cron routes with real `CRON_SECRET`: orchestrate, price-alert evaluation, and ops-alert evaluation.
- [ ] Configure persistent KV and verify `/api/health` reports persistent cache, not memory.
- [ ] Configure one approved pricing partner and verify provider-returned rates from production without fabricated fallbacks.
- [ ] Configure licensed review/property-content provider access before showing review copy, ratings, or rich property descriptions.
- [ ] Run `SITE_URL=https://your-deployment.example npm run smoke:deployment` after strict production readiness passes.

### P1: Quality And Trust

- [x] Raise `lib` branch coverage from 83.26% toward 84%, then keep ratcheting upward.
- [x] Raise `lib` branch coverage from 84.07% toward 85%, then keep ratcheting upward.
- [x] Raise `lib` branch coverage from 85.08% toward 88%, then keep ratcheting upward.
- [x] Raise `lib` branch coverage from 88.14% toward 90%, focusing on catalog, cache/date edge cases, Wikidata enrichment, ops scorecard, and provider delivery branches.
- [x] Raise `lib` branch coverage from 90.04% toward 92%, focusing on hotels-catalog, price-cache, catalog-candidates, Wikivoyage, Xotelo discovery, admin audit, OpenTripMap, rate-limit, and provider delivery branches.
- [x] Raise `lib` branch coverage from 92.04% toward 94%, focusing on hotels-catalog, price-cache, catalog-candidates, cheaper-dates, Wikivoyage, KV, and provider delivery branches.
- [x] Raise `lib` branch coverage from 94.17% toward 96%, focusing on hotels-catalog, Overpass POI, Wikidata enrichment, health readiness, ops scorecard, Ticketmaster, alert delivery, weather, and Wikipedia branches.
- [ ] Raise `lib` branch coverage from 96.16% toward 97%, focusing on hotels-catalog, ops alerts, provider observability, Nominatim, public URL safety, health readiness, and remaining API error branches.
- [x] Add focused tests for Overpass discovery, agent utilities, i18n edge cases, ops alert thresholds, and provider registry merge/circuit-breaker branches.
- [ ] Replace reused catalog images with licensed hotel- or city-specific media.
- [x] Add a stronger provenance wiring audit for catalog candidate promotion, source URLs, provider links, and provider-returned rates.
- [ ] Extend provenance audit to require licensed/source metadata for every legacy static catalog item and catalog image.
- [x] Add deployment smoke checks for public APIs, protected admin APIs, cron guards, and unavailable-state behavior.
- [ ] Run deployment smoke checks in a configured production deployment and capture passing evidence.

### P2: Market Scale

- [ ] Expand catalog ingestion through the admin candidate workflow only; do not auto-promote discovered hotels.
- [ ] Add duplicate detection and provenance review dashboards for catalog candidates at scale.
- [x] Add provider coverage telemetry by city/country/date so gaps are measurable before claims are displayed.
- [ ] Add real alert delivery provider integration for price alerts, unsubscribe tokens, and ops alerts.
- [ ] Add web push only after approved notification-provider setup and health readiness proof.

### P3: Number-One Product Work

- [ ] Build a production observability dashboard covering uptime, provider latency, cache hit rate, alert delivery, price mismatch reports, and catalog provenance quality.
- [ ] Add real-user monitoring and Core Web Vitals tracking per top route and device class.
- [ ] Add international localization QA beyond Hebrew/English, including RTL/LTR layout regression checks.
- [ ] Add commercial/legal readiness for partner terms, affiliate disclosures, privacy, retention, and licensed content display.
- [ ] Add competitor parity tracking for inventory breadth, price freshness, mobile installability, reviews, alerts, and booking handoff quality.

## Detailed Execution Plan

| Phase | Substeps | Exit criteria |
| --- | --- | --- |
| 0. Production truth | Configure real admin/cron secrets, Upstash, Kinde, one partner pricing provider, licensed review/property provider, and alert delivery provider. | `npm run audit:production:strict` passes in deployment without placeholder values. |
| 1. Deployment proof | Deploy, run public API smoke checks, protected admin checks, cron checks, unavailable-state checks, cache durability checks, and provider-returned rate checks. | Health reports persistent cache, partner provider configured, and no fabricated fallback data. |
| 2. Trust and provenance | Add source/provenance coverage for catalog entries, catalog images, provider links, price observations, review snippets, and property content. | A provenance audit fails any new item that cannot be traced to an allowed source or licensed provider. |
| 3. Quality ratchet | Raise branch coverage to 97%+, focusing on catalog, health readiness, ops, provider observability, URL safety, storage, and network failure paths. | Coverage floors are increased after each verified pass and CI blocks regression. |
| 4. Content scale | Expand inventory only through candidate ingestion, duplicate detection, source review, admin approval, and licensed media replacement. | Catalog grows without fake items, duplicate identities, unsafe URLs, or reused unlicensed media. |
| 5. Product parity | Add provider coverage matrix, price freshness, alert delivery, mobile push, RUM, Core Web Vitals, competitor parity dashboard, and legal/commercial signoff. | Product can be compared against Booking, Google Travel, KAYAK/HotelsCombined, Expedia, trivago, Fattal, and Isrotel with live metrics instead of manual claims. |
| 6. Number-one loop | Run weekly competitor audits, source-quality audits, conversion/drop-off analysis, support-risk review, and pricing accuracy drift review. | The roadmap is driven by measured gaps in inventory, freshness, trust, speed, mobile retention, and booking handoff quality. |

## Non-Negotiables

- Never use `Math.random()`.
- Never display fabricated hotel, review, price, provider, urgency, availability, or production-readiness data.
- Never use invented secrets to make readiness checks pass.
- If a provider, credential, review license, or data source is missing, show the missing state explicitly.
