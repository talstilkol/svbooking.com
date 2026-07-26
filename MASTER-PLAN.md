# SV Booking Production Stabilization Plan

## Current State

The app is locally healthy but not production-ready until real deployment configuration is present.

| Area | Score | Current status |
| --- | ---: | --- |
| Determinism and no-fabrication guardrails | 9/10 | `Math.random()` and unapproved UUID randomness are blocked by scans/audits; this is still not a formal proof that every future data path has complete provenance. |
| Local build/test health | 10/10 | Lint, typecheck, unit/API tests, build, and E2E are expected release gates. |
| Coverage depth | 10/10 | `npm run audit:coverage` now enforces 100% `lib` coverage across lines, statements, functions, and branches. |
| Security guardrails | 8/10 | Admin bearer auth, CSRF checks, HTML-safety, storage, privacy, alert, public API URL safety, and no-store audits are wired; production enforcement still depends on real env and deployment verification. |
| Catalog quality | 6/10 | 502 curated hotels across 139 cities and 65 countries; clears the local floor, still far below market-scale coverage; reused catalog imagery is now tracked as an ops scorecard blocker. |
| Provider coverage | 5/10 | Six pricing adapters exist, but production needs real configured partner credentials beyond the no-auth baseline. |
| Reviews and property content | 4/10 | APIs return explicit unavailable states until licensed provider data is configured; rich review/property content is not live. |
| Mobile retention | 5/10 | PWA/offline shell, local alerts, and audited RUM/Web Vitals wiring exist; push delivery env and provider are not configured. |
| Production readiness | 4/10 | Strict readiness fails without admin, cron, Redis, Kinde, partner-provider env, approved catalog media, licensed reviews, alert delivery, unsubscribe, ops delivery, and push keys. |
| Release hygiene | 10/10 | The worktree is clean; keep generated/cache artifacts out of commits. |

## Next Execution Master Plan

Snapshot date: 2026-07-26.

This continuation plan is based on the latest local state, dependency-queue review, production-readiness audit output, and current launch blockers. The July continuation fixed the actionable production dependency advisory, separated the blocking production audit from transparent development-tooling reporting, and returned focus to production proof rather than more local scaffolding.

### Reviewed Previous Work

| Evidence | Current finding | Meaning |
| --- | --- | --- |
| Latest commits | Recent commits localized upcoming trips, accessibility, compare, hotel-card toast, suggestion, and agent health surfaces, plus component hydration cleanup. | The active local track has been UI/i18n hardening and test stability. |
| `npm run release:state` | Clean worktree before the July dependency continuation. | There was no unfinished local code change to rescue before dependency maintenance. |
| `npm run audit:master-plan` | Passed before this update. | The existing plan/accountability ledger is internally consistent. |
| `npm run audit:production` | `productionReady: false`. | The blocker is deployment configuration, licensed/approved providers, media approval, alert delivery, push, and production evidence. |
| Catalog media audit state | 112 image sources need approved license metadata or replacement; 6 reused image sources remain. | Media provenance is a concrete launch blocker, not a visual polish task. |
| Current local catalog | 502 hotels, 139 cities, 65 countries. | Good local floor, still not market-scale inventory. |
| Latest main state reviewed | Main reached `bc31dcf9ca00bdbc983aa964b51a5b4cb20fe02d` after merging Dependabot PR #21 for `undici` 7.28.0. | The high-severity `undici` advisory that blocked the July PR queue is resolved; the refreshed CI result must still be captured after this plan update is pushed. |

### Execution Logic

1. Do not mark production tasks done from local code alone.
2. Keep unavailable states until real provider, license, or secret evidence exists.
3. Run narrow verification immediately after each work package.
4. Do not expand catalog or claim parity until durable KV, provider observations, and review workflows have production evidence.
5. Keep `Math.random()` and unapproved UUID randomness forbidden in all new work.

### Phase 0A - Dependency Maintenance Queue

The first June 18, 2026 dependency queue is closed. A second queue was reviewed on July 26, 2026. PR #21 was merged first because its `undici` fix removed the common CI blocker. TypeScript and ESLint semver-major updates remain intentionally blocked until their framework/tooling compatibility work is scheduled.

| PR | Dependency change | Decision | Required verification |
| --- | --- | --- | --- |
| #2 | `@kinde-oss/kinde-auth-nextjs` 2.12.1 -> 2.12.2 | DONE - merged after CI passed. Auth flows remain covered by the release gate. | CI `Verify` passed |
| #7 | `react`, `react-dom`, and `@types/react` 19.2.4/19.2.14 -> 19.2.7/19.2.17 | DONE - merged as the React runtime patch group. | CI `Verify` passed |
| #8 | `next`, `@next/bundle-analyzer`, and `eslint-config-next` 16.2.6 -> 16.2.9 | DONE - merged after the React runtime update. Any future Next API/code change must still check the local Next 16 docs first. | CI `Verify` passed |
| #9 | `@types/node` 20.19.40 -> 20.19.43 | DONE - merged as a low-risk patch. Keep semver-major Node types blocked unless the project intentionally moves the type baseline. | CI `Verify` passed |
| #10 | `@playwright/test` 1.59.1 -> 1.61.0 | DONE - merged after the full Playwright suite passed. | CI `Verify` passed |
| Security advisory follow-up | `@babel/core` low advisory | Fixed by lockfile update to `@babel/core` 7.29.7; GitHub Dependabot alert #4 is fixed. Keep the production dependency audit in the release gate and the full audit as a reporting check. | `npm audit --omit=dev --audit-level=moderate`, full audit report |
| GitHub Actions runtime | `actions/checkout` and `actions/setup-node` v4 -> v6 | DONE - updated workflow actions to their Node 24 runtime and added Dependabot tracking for future action updates. | `npm run audit:master-plan`, YAML parse, CI `Verify` passed |
| #11 | `eslint` 9.39.4 -> 10.5.0 | BLOCKED - do not merge. CI fails in `react/display-name` because the current Next ESLint plugin stack is not compatible with ESLint 10. Dependabot now ignores `eslint` semver-major updates. | Revisit only after `eslint-config-next` supports the target ESLint major |
| #16 | `vitest` and `@vitest/coverage-v8` 4.1.6 -> 4.1.9 | DONE - merged after Dependabot recreated the two test-toolchain patches as the `vitest-tooling` group. | CI `Verify` passed; main CI `27743957302` passed |
| #17 | `tailwindcss` and `@tailwindcss/postcss` patch group | DONE - merged as the Tailwind tooling patch group after CI passed. | CI `Verify` passed; main CI `27744336204` passed |
| #14 | `lucide-react` 1.14.0 -> 1.21.0 | DONE - merged after build and E2E stayed green. | CI `Verify` passed; main CI `27744638631` passed |
| #18 | `@vitejs/plugin-react` 6.0.1 -> 6.0.2 | DONE - merged after CI passed on the rebased branch. | CI `Verify` passed; main CI `27745031330` passed |
| #19 | `framer-motion` 12.38.0 -> 12.40.0 | DONE - merged after Dependabot rebased the branch on top of #18 and the refreshed `Verify` passed. | CI `Verify` passed; main CI `27745383482` passed |
| #20 | `typescript` 5.9.3 -> 6.0.3 | BLOCKED - do not merge as routine maintenance. This is a compiler major and needs a dedicated migration after the current Next/tooling stack declares compatibility. Dependabot now ignores TypeScript semver-major updates. | Dedicated migration branch, local Next docs, typecheck, build, full test suite |
| #21 | `undici` 7.26.0 -> 7.28.0 | DONE - merged first because it fixes the high-severity advisory that caused every refreshed dependency PR to fail its audit step. | PR patch reviewed; `Verify` passed before merge |
| #22 | `actions/checkout` 6 -> 7 | PENDING - previous failure was caused by the shared `undici` audit blocker. Rebase and require fresh `Verify` before merge. | Rebased CI `Verify` |
| #23 | `@playwright/test` 1.61.0 -> 1.61.1 | PENDING - patch update; rebase after the security-gate commit and require fresh `Verify`. | Rebased CI `Verify`, Playwright suite |
| #24 | `@vitejs/plugin-react` 6.0.2 -> 6.0.3 | PENDING - patch update; rebase after the security-gate commit and require fresh `Verify`. | Rebased CI `Verify`, build/tests |
| #25 | `framer-motion` 12.40.0 -> 12.41.0 | PENDING - patch update; rebase after the security-gate commit and require fresh `Verify`. | Rebased CI `Verify`, E2E |
| #26 | `actions/setup-node` 6 -> 7 | PENDING - previous failure was caused by the shared `undici` audit blocker. Rebase and require fresh `Verify` before merge. | Rebased CI `Verify` |
| July production dependency audit | `next`, `postcss`, `sharp`, `js-yaml`, and transitive lockfile patches | DONE locally - non-breaking audit fixes are applied, PostCSS resolves to 8.5.23, and the Next image path resolves to `sharp` 0.35.3. CI remains scoped to production dependencies. | Production audit reports 0 vulnerabilities; dependency tree, build, runtime image optimization, 200/1200 tests, 100% coverage, and 78 E2E tests pass |
| Development-tooling advisory | `brace-expansion` through ESLint 9/minimatch 3 | BLOCKED - full audit remains a reporting check. A global override to `brace-expansion` 5 is incompatible with minimatch 3, and npm's proposed ESLint 10 change is breaking. | Revisit when the Next ESLint stack supports ESLint 10; keep full audit result documented |

This keeps update PRs aligned with runtime packages, avoids opening unsupported Node types, TypeScript, or ESLint majors, and prevents GitHub Actions runtime deprecation warnings from returning unnoticed.

### Phase 0 - Preserve The Local Baseline

| Work package | Owner | Done criteria | Verification |
| --- | --- | --- | --- |
| Freeze the current local truth | Code | Plan, README, audit report, and runbook remain aligned after any edits. | `npm run audit:docs`, `npm run audit:master-plan` |
| Keep release hygiene clean | Code | Only intentional files are changed; generated artifacts stay out. | `npm run release:state`, `git status --short` |
| Re-run fast safety gates after planning changes | Code | No docs/audit drift introduced by roadmap edits. | `npm run audit:master-plan`, `npm run release:state` |

### Phase 1 - Production Environment Proof

| Work package | Owner | Done criteria | Verification |
| --- | --- | --- | --- |
| Configure required deployment secrets | Human/operator | Real values exist in deployment for admin, cron, Upstash Redis, Kinde, and one complete partner pricing provider env group. | Deployment `npm run audit:production:strict` no longer fails for required env. |
| Configure durable KV | Human/operator + code verification | `/api/health` reports persistent cache instead of memory fallback. | Deployed health check plus `SITE_URL=... npm run smoke:deployment` |
| Configure Kinde production auth | Human/operator + code verification | Protected account/dashboard routes work with real login and admin allowlist. | Manual login smoke plus admin route smoke with `ADMIN_API_SECRET` only where required. |
| Configure one approved pricing provider | Human/operator | At least one partner provider returns verified rates without fabricated fallback. | Provider route smoke, provider uptime ledger, compare API response provenance. |

### Phase 2 - Launch Blockers With Concrete Artifacts

| Work package | Owner | Done criteria | Verification |
| --- | --- | --- | --- |
| Resolve catalog media licensing | Human/operator + code | Reused/unapproved catalog images are replaced or approved with source/license metadata. | `npm run catalog:media:ledger`, `npm run audit:catalog-media-ledger`, `npm run audit:production:strict` |
| Configure licensed review/property provider | Human/operator + code | Review/property APIs use licensed provider data only when `REVIEWS_PROVIDER_LICENSED` and provider key are valid. | Review/property API smoke; unavailable state remains when provider is absent. |
| Configure price alert delivery | Human/operator + code | Triggered alerts deliver sanitized webhook payloads and deterministic unsubscribe tokens. | Price-alert delivery tests plus deployed smoke against configured webhook. |
| Configure ops alert delivery | Human/operator + code | Critical/warning ops alerts deliver sanitized webhook payloads. | `/api/ops/alerts/evaluate` with cron auth and delivery-event inspection. |
| Configure push readiness | Human/operator + code | Push keys are configured with an approved provider and health reports push readiness. | `/api/health`, PWA audit, manual install/push smoke. |

### Phase 3 - Deployed Runtime Verification

| Work package | Owner | Done criteria | Verification |
| --- | --- | --- | --- |
| Run strict production gate in deployment | Human/operator | Strict production readiness passes with real deployment env. | `npm run audit:production:strict` in deployment. |
| Run deployment smoke | Human/operator | Public APIs, protected admin APIs, unavailable states, and optional cron checks behave correctly. | `SITE_URL=https://... npm run smoke:deployment` |
| Verify cron routes | Human/operator | Orchestrate, price-alert evaluation, and ops-alert evaluation run only with real `CRON_SECRET`. | Deployed cron responses plus event ledgers. |
| Capture RUM/Core Web Vitals proof | Human/operator | Top routes have production route/device evidence. | Vercel Analytics/Speed Insights evidence and `npm run audit:rum` locally. |
| Configure external monitoring | Human/operator | Uptime, provider latency, cache durability, alert delivery, price mismatch, catalog provenance, and RUM are monitored outside the app. | External monitor report plus ops scorecard evidence. |

### Phase 4 - Growth After Launch Safety

| Work package | Owner | Done criteria | Verification |
| --- | --- | --- | --- |
| Scale catalog through candidate workflow | Code + human review | Discovery writes candidates only; admin approval promotes verified hotels. | Candidate queue review, duplicate/provenance summaries, `npm run audit:provenance` |
| Build provider coverage evidence | Code + operations | City/country/date/provider coverage comes from verified price observations only. | `/api/agents/providers/coverage`, provider observation ledgers. |
| Extend localization only with approved copy | Code + content | Hebrew/English remain product-ready; Arabic/French/Spanish stay QA-only until approved. | `npm run audit:i18n`, E2E RTL/LTR checks. |
| Capture legal/commercial signoff | Human/operator | Partner terms, affiliate/legal review, and licensed content display approval are stored outside code. | Release evidence linked from runbook or deployment checklist. |
| Run competitor parity review | Human/operator + code | Weekly source review compares inventory, freshness, mobile, reviews, alerts, handoff, and Israel coverage. | Ops scorecard parity section plus dated external evidence. |

### Recommended Command Flow

Use this order because each stage answers a different risk:

```bash
npm run launch:readiness:report
npm run release:state
npm run audit:master-plan
npm run audit:docs
npm run audit:guardrails
npm run audit:provenance
npm run audit:catalog-media-ledger
npm run audit:production
```

Before release or deployment candidate:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run audit:coverage
npm run build
npm run test:e2e
npm run release:state:strict
```

After deployment configuration:

```bash
npm run audit:production:strict
SITE_URL=https://your-deployment.example npm run smoke:deployment
```

## Accountability Audit

This section is the source of truth for what is complete versus only locally scaffolded.

| Plan item | Status | Honest verification |
| --- | --- | --- |
| Determinism: no `Math.random()` | DONE | `rg "Math\.random\|crypto\.randomUUID" app components lib scripts tests proxy.ts -S` returns no code matches. |
| No-fabrication guardrails | PARTIAL | `npm run audit:guardrails` and `npm run audit:provenance` pass; static catalog items and image source/license-status metadata are audited, while approved licensed replacements and future provider/content paths remain open. |
| Local lint/unit/build/E2E health | DONE | `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` passed locally. |
| Coverage ratchet current floor | DONE | `npm run audit:coverage` passes at 100% lines, 100% statements, 100% functions, 100% branches; floors are now 100% for every tracked `lib` dimension. |
| Coverage to world-class depth | DONE | `lib` coverage is 100% across lines, statements, functions, and branches; future work should preserve the ratchet and add app/runtime coverage where needed. |
| Security audits wired | DONE | CSRF, HTML safety, storage, privacy, alert, public URL, affiliate, no-store, API error, and cron-cache audits pass locally. |
| Cron localhost bypass removed | DONE | Cron routes fail closed when `CRON_SECRET` is missing, including localhost; tests and deployment-smoke expectations now require explicit cron auth. |
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
| Production env gate | NOT DONE | `npm run audit:production:strict` correctly fails locally on missing real env, unresolved catalog media quality, licensed review provider, alert delivery, ops delivery, and push keys. |
| Health/scorecard launch-readiness alignment | DONE | Runtime health and ops scorecard now use the same launch-service contract as strict readiness and keep `freeOnlyLaunchReady` false until catalog media, reviews, alert delivery, unsubscribe, ops delivery, and push keys are ready. |
| Docs drift prevention | DONE | `npm run audit:docs` passes and CI includes the docs audit. |
| README, `.env.example`, runbook, plan alignment | PARTIAL | Audits pass for key snippets and env names, but not every operational runbook instruction has a live deployment proof. |
| Public API unsafe URL prevention | DONE | `npm run audit:public-api-urls` passes and the Playwright JSON scanner is wired in CI. |
| Public data response contracts | DONE | Public price, destination, weather, exchange-rate, holiday, city-info, event, POI, guide, review, and property-content responses are guarded for source/dataPolicy/unavailable contracts. |
| Validated catalog candidate promotion | PARTIAL | Candidate and admin approval paths exist and provenance wiring is audited; production-scale ingestion with real reviewed approvals is not complete. |
| Licensed media replacement | NOT DONE | `audit:catalog` still warns about reused Unsplash images across cities. |
| Agent cron auth | DONE | Cron-protected routes and `CRON_SECRET` gate are wired and audited. |
| Production cron execution | NOT DONE | Cron routes are not verified in a real deployment with real `CRON_SECRET` and persistent KV. |
| Ops monitoring endpoints | PARTIAL | `/api/health`, `/api/ops/scorecard`, `/api/ops/alerts`, provider uptime, price accuracy, alert history, and audited RUM wiring exist; real external monitoring and webhook delivery are not configured. |
| Production dependency audit | DONE | `npm audit --omit=dev --audit-level=moderate` reports 0 vulnerabilities after the July lockfile, PostCSS, Next, and `sharp` remediation. |
| Full development dependency audit | BLOCKED | `brace-expansion` remains through ESLint 9/minimatch 3; the compatible fix requires a future ESLint major migration, so the full audit is reported but does not replace the production gate. |
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
| Current State | Coverage depth | DONE | Ratchet passes at 100% `lib` coverage across lines, statements, functions, and branches. |
| Current State | Security guardrails | PARTIAL | Local audits pass; production enforcement still requires real deployment env. |
| Current State | Catalog quality | PARTIAL | 502 hotels/139 cities/65 countries pass the floor; imagery reuse and market scale remain open. |
| Current State | Provider coverage | PARTIAL | Adapter layer exists; real partner credentials are not configured. |
| Current State | Reviews and property content | PARTIAL | Unavailable state is correct; licensed rich review/property data is not live. |
| Current State | Mobile retention | PARTIAL | PWA shell and audited RUM/Web Vitals wiring exist; push delivery is not configured. |
| Current State | Production readiness | NOT DONE | Strict production readiness fails locally due missing real env, unresolved catalog media quality, licensed review provider, alert delivery, ops delivery, and push keys. |
| Current State | Release hygiene | DONE | Worktree was clean after the last release-state strict gate. |
| Accountability | Determinism: no `Math.random()` | DONE | Scan returned no `Math.random()` or unapproved UUID usage. |
| Accountability | No-fabrication guardrails | PARTIAL | Claims and provenance-wiring audits pass, but static legacy catalog/image provenance and future provider/content paths still need stronger licensed-source controls. |
| Accountability | Local lint/unit/build/E2E health | DONE | Verified by local gates. |
| Accountability | Coverage ratchet current floor | DONE | `npm run audit:coverage` passed at the current floor. |
| Accountability | Coverage to world-class depth | DONE | `lib` coverage is exhaustive under the current coverage scope. |
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
| Accountability | Health/scorecard launch-readiness alignment | DONE | `freeOnlyLaunchReady` now requires the strict launch service set instead of only core auth/cache/provider env. |
| Accountability | Docs drift prevention | DONE | `audit:docs` passes. |
| Accountability | README, `.env.example`, runbook, plan alignment | PARTIAL | Static docs align; live deployment runbook evidence is missing. |
| Accountability | Public API unsafe URL prevention | DONE | Public URL audit passes. |
| Accountability | Public data response contracts | DONE | `audit:public-data-contracts` guards source/dataPolicy/unavailable contracts, destination source truth, and direct weather/exchange/holiday/city-info source states. |
| Accountability | Validated catalog candidate promotion | PARTIAL | Candidate flow and provenance guard audit exist; production-scale reviewed promotion is incomplete. |
| Accountability | Licensed media replacement | NOT DONE | Reused Unsplash imagery warnings remain. |
| Accountability | Agent cron auth | DONE | Cron auth gate is wired and audited. |
| Accountability | Production cron execution | NOT DONE | Not verified in deployment with real `CRON_SECRET` and persistent KV. |
| Accountability | Ops monitoring endpoints | PARTIAL | Endpoints and RUM wiring audit exist; external monitoring/webhook delivery is not configured. |
| Accountability | Production dependency audit | DONE | Approved-network `npm audit --omit=dev --audit-level=moderate` reports 0 vulnerabilities. |
| Accountability | Full development dependency audit | BLOCKED | The remaining advisory is development-only through ESLint 9; no compatible non-breaking upstream fix is currently available. |
| Accountability | `audit:production:strict` in deployment | NOT DONE | No deployment proof has been provided. |
| Accountability | No stale removed-route docs | DONE | Docs audit blocks stale route/architecture claims. |
| Accountability | Unknown data shown explicitly | PARTIAL | Covered for many surfaces; must be kept as integrations expand. |
| Accountability | Faked work | DONE | No completion was intentionally marked from simulation; inflated scoring was corrected downward. |
| Stabilization Priority | Configure real admin, cron, Redis, Kinde, and partner-provider env | NOT DONE | Requires real secrets and provider contracts outside the repo. |
| Stabilization Priority | Treat `audit:production:strict` as go-live blocker | DONE | Documented and enforced by the strict audit script. |
| Stabilization Priority | Align health and scorecard launch readiness with strict launch services | DONE | Health and scorecard no longer mark local launch ready without approved catalog media, licensed reviews, alert delivery, unsubscribe, ops delivery, and push keys. |
| Stabilization Priority | Review modified/deleted/untracked files before staging | DONE | Release-state strict was clean before commits. |
| Stabilization Priority | Split unrelated work into reviewable commits | DONE | Last work was split into two focused commits. |
| Stabilization Priority | Keep generated/cache artifacts out of commits | DONE | Release-state strict reported no generated artifacts. |
| Stabilization Priority | Raise branch coverage from 84.07% toward 85% | DONE | Current branch coverage is 100% and the floor is 100%. |
| Stabilization Priority | Prioritize remaining branch coverage hot spots | DONE | Overpass, provider registry, i18n, ops alert, price-cache, provider accuracy, public URL, geolocation, discovery, Wikidata, Google Places reviews, catalog candidate locking, provider uptime, OpenTripMap, Xotelo, rate-limit, admin audit, ops scorecard, POI/weather/event sparse payloads, user-data cleanup, review fallback, alert delivery, durable catalog load, strict admin-only auth, cheaper-date heatmap bracket, admin-session, price-recommendation, REST Countries, DBpedia, map-marker, request-origin, ops delivery, unsubscribe-token, currency/storage, health readiness, Wikipedia batching, catalog full-load, hotel-popularity, deterministic TTL jitter, continent indexing, ops-alert sorting, and webhook URL branches were expanded; no uncovered branch remains. |
| Stabilization Priority | Keep coverage reports out of commits | DONE | Coverage artifacts were not staged. |
| Stabilization Priority | Keep README, env example, runbook, and plan aligned | PARTIAL | Local docs audit passes; deployment runbook evidence is missing. |
| Stabilization Priority | Run docs audit in CI | DONE | `audit:docs` is wired in CI. |
| Stabilization Priority | Keep public URL and runtime JSON scanners enabled | DONE | `audit:public-api-urls` is wired and passes. |
| Stabilization Priority | Add public data contract audit for source/unavailable states across public data APIs | DONE | Public data contract audit now blocks source/dataPolicy/unavailable regressions, verifies destination source lists only include available sources, and covers weather, exchange-rate, holiday, and city-info endpoints. |
| Stabilization Priority | Promote only validated catalog candidates | DONE | Local promotion now requires explicit admin approval plus usable provenance and verified latitude/longitude; production-scale exercise remains a separate launch task. |
| Stabilization Priority | Replace reused/stock-like catalog images | PARTIAL | Catalog audit still warns about reused city images; ops scorecard exposes reused media and `audit:catalog-media-ledger` keeps the exact image-source review queue aligned until licensed replacements are approved. |
| Stabilization Priority | Add licensed reviews/property providers | NOT DONE | No licensed provider env is configured. |
| Stabilization Priority | Keep unknown data unavailable/not configured | PARTIAL | Local behavior exists; future integrations need continuous enforcement. |
| Stabilization Priority | Run agent cron routes only with `CRON_SECRET` | DONE | Cron auth checks are wired and audited. |
| Stabilization Priority | Monitor health, scorecard, alerts, uptime, price accuracy, alert delivery | PARTIAL | Local endpoints and RUM wiring audit exist; external monitoring and webhook delivery are not configured. |
| Stabilization Priority | Keep production dependency auditing in approved network env | DONE | CI blocks on `npm audit --omit=dev --audit-level=moderate`; the full audit remains a documented reporting check. |
| Acceptance Criteria | `npm run lint` passes | DONE | Passed locally. |
| Acceptance Criteria | `npm test` passes | DONE | 200 files / 1200 tests passed. |
| Acceptance Criteria | `npm run test:coverage` runs and trend is reviewed | DONE | Coverage was generated and reviewed; ratchet was raised. |
| Acceptance Criteria | `npm run audit:coverage` passes | DONE | Passed at 100% lines, statements, functions, and branches. |
| Acceptance Criteria | `npm run build` passes | DONE | Next.js build passed with 729 static pages. |
| Acceptance Criteria | `npm run test:e2e` passes | DONE | 78 Playwright tests passed. |
| Acceptance Criteria | Every non-strict `npm run audit:*` passes | DONE | All non-strict audit scripts passed locally. |
| Acceptance Criteria | `audit:production:strict` passes in deployment | NOT DONE | No deployment env proof exists. |
| Acceptance Criteria | `npm audit --omit=dev --audit-level=moderate` has no moderate vulnerabilities | DONE | Approved-network production audit reported 0 vulnerabilities. |
| Acceptance Criteria | README and plan contain current catalog count | DONE | Docs audit checks 502 hotels, 139 cities, 65 countries. |
| Acceptance Criteria | No removed-route or stale architecture docs | DONE | Docs audit blocks stale claims. |
| Backlog P0 | Configure real deployment env | NOT DONE | Requires real secrets. |
| Backlog P0 | Run strict production audit in deployment | NOT DONE | Requires configured deployment. |
| Backlog P0 | Verify deployed cron routes | NOT DONE | Requires deployed cron and real `CRON_SECRET`. |
| Backlog P0 | Configure persistent KV and verify health reports persistent cache | NOT DONE | Requires Upstash/deployment env. |
| Backlog P0 | Configure approved pricing partner and verify provider-returned rates | NOT DONE | Requires partner credentials. |
| Backlog P0 | Configure licensed review/property provider | NOT DONE | Requires licensed provider access. |
| Backlog P1 | Raise branch coverage from 83.26% toward 84% | DONE | Coverage ratchet has moved past this milestone. |
| Backlog P1 | Raise branch coverage from 84.07% toward 85% | DONE | Current branch coverage is 100%. |
| Backlog P1 | Raise branch coverage from 85.08% toward 88% | DONE | Current branch coverage is 100% and the floor is 100%. |
| Backlog P1 | Raise branch coverage from 88.14% toward 90% | DONE | Current branch coverage is 100% and the floor is 100%. |
| Backlog P1 | Raise branch coverage from 90.04% toward 92% | DONE | Current branch coverage is 100%; the ratchet floor is now 100%. |
| Backlog P1 | Add focused tests for remaining weak branches | DONE | Focused network, provider, cache, i18n, ops, URL-safety, geolocation, discovery, Wikidata, Google Places reviews, catalog candidate locking, provider uptime, OpenTripMap, Xotelo, rate-limit, admin audit, ops scorecard, dynamic catalog, cheaper-date fallback, catalog candidates, KV adapter, webhook, DBpedia/Wikivoyage, POI/weather/event sparse payloads, user-data cleanup, review fallback, alert delivery, durable catalog load, strict admin-only auth, heatmap bracket, admin-session, price-recommendation, REST Countries, map-marker, request-origin, ops delivery, unsubscribe-token, currency/storage, health readiness, Wikipedia batching, catalog full-load, hotel-popularity, deterministic TTL jitter, continent indexing, ops-alert sorting, and webhook URL tests/guards were completed; no uncovered branch remains. |
| Backlog P1 | Raise `lib` branch coverage toward 99.3% | DONE | Coverage reached 100% branches and the ratchet floor was raised above this target. |
| Backlog P1 | Raise `lib` branch coverage toward 99.5% | DONE | Coverage reached 100% branches and the ratchet floor was raised above this target. |
| Backlog P1 | Raise `lib` branch coverage toward 99.6% | DONE | Coverage reached 100% branches and the ratchet floor was raised above this target. |
| Backlog P1 | Raise `lib` branch coverage toward 99.7% | DONE | Coverage reached 100% branches and the ratchet floor was raised above this target. |
| Backlog P1 | Raise `lib` branch coverage toward 99.8% | DONE | Coverage reached 100% branches and the ratchet floor was raised above this target. |
| Backlog P1 | Raise `lib` branch coverage toward 99.9% | DONE | Coverage reached 100% branches and the ratchet floor was raised above this target. |
| Backlog P1 | Raise `lib` branch coverage to 100% | DONE | Coverage reached 100% branches and the ratchet floor was raised to 100%. |
| Backlog P1 | Raise `lib` line/function coverage closer to 100% | DONE | Current line, statement, function, and branch coverage is 100%. |
| Backlog P1 | Replace reused catalog images | PARTIAL | Image reuse warnings remain; ops scorecard tracks the blocker and `npm run audit:catalog-media-ledger` validates the exact replacement/license-approval queue. |
| Backlog P1 | Add stronger provenance audit | DONE | `audit:provenance` now checks candidate promotion provenance, provider-link sanitization, provider-returned rate source URLs, and static catalog item/image source plus license-status metadata. |
| Backlog P1 | Add deployment smoke checks | PARTIAL | `smoke:deployment` now exists for public, admin, cron-guard, and unavailable-state checks; it has not been run against a configured deployment. |
| Backlog P2 | Expand catalog through admin candidate workflow only | DONE | Discovery writes candidate queues, direct auto-promotion is audit-blocked, and scale exercise remains separate from this local workflow guard. |
| Backlog P2 | Add duplicate/provenance review dashboards | PARTIAL | Admin APIs and the agent dashboard now expose deterministic ready/blocked/duplicate/provenance/location/source/city review summaries; production-scale reviewed operation is still incomplete. |
| Backlog P2 | Add provider coverage telemetry by city/country/date | DONE | `/api/agents/providers/coverage` and provider dashboard summary now derive coverage from verified `price:observations:*` records and return `insufficient-data` when there is no evidence. |
| Backlog P2 | Add real alert delivery provider integration | NOT DONE | Webhook/push/email provider is not configured. |
| Backlog P2 | Add web push after approved provider setup | NOT DONE | Push keys/provider are absent. |
| Backlog P3 | Production observability dashboard | PARTIAL | Authenticated dashboard now surfaces ops scorecard, alert counts, domain status, and top blockers; external monitoring, RUM, and webhook proof are still incomplete. |
| Backlog P3 | Real-user monitoring and Core Web Vitals | PARTIAL | Vercel Analytics, Speed Insights, and local Core Web Vitals instrumentation are wired and audited; production route/device proof is missing. |
| Backlog P3 | Localization QA beyond Hebrew/English | DONE | QA-only Arabic, French, and Spanish locale matrix exists; Arabic exercises RTL, French/Spanish exercise LTR, and fallback-only content is explicit until full translations are approved. |
| Backlog P3 | Commercial/legal readiness | PARTIAL | CI-wired legal readiness audit now protects privacy, terms, cookie, affiliate, and provider-handoff disclosures; partner terms, affiliate/legal review, and licensed content display signoff remain external launch blockers. |
| Backlog P3 | Competitor parity tracking | PARTIAL | Ops scorecard now includes sourced competitor parity tracking for inventory breadth, price freshness, mobile installability, reviews/property content, alerts, booking handoff, and Israel coverage; weekly source review and live production proof are still incomplete. |
| Non-Negotiable | Never use `Math.random()` | DONE | Scan is clean. |
| Non-Negotiable | Never display fabricated hotel/review/price/provider/urgency/availability/readiness data | PARTIAL | Guardrails pass; exhaustive provenance proof remains open. |
| Non-Negotiable | Never use invented secrets | DONE | Strict readiness fails instead of accepting placeholders. |
| Non-Negotiable | Show missing provider/credential/license/source as unavailable | PARTIAL | Existing paths do this; every future integration must preserve it. |

## Checked Backlog Re-Audit

This is the brutal re-check of every item currently marked `[x]`. DONE here means the narrow local deliverable exists and was verified; it does not mean the related production/market outcome is complete.

| Checked item | Status | Brutal verdict |
| --- | --- | --- |
| Raise `lib` branch coverage from 83.26% toward 84%, then keep ratcheting upward. | DONE | Real and verified by the current 100% branch coverage result. |
| Raise `lib` branch coverage from 84.07% toward 85%, then keep ratcheting upward. | DONE | Real and verified by the current coverage ratchet. |
| Raise `lib` branch coverage from 85.08% toward 88%, then keep ratcheting upward. | DONE | Real and verified by the current coverage ratchet. |
| Raise `lib` branch coverage from 88.14% toward 90%, focusing on catalog, cache/date edge cases, Wikidata enrichment, ops scorecard, and provider delivery branches. | DONE | Real; focused branch tests exist, but remaining coverage is not exhaustive. |
| Raise `lib` branch coverage from 90.04% toward 92%, focusing on hotels-catalog, price-cache, catalog-candidates, Wikivoyage, Xotelo discovery, admin audit, OpenTripMap, rate-limit, and provider delivery branches. | DONE | Real; coverage passed far above this milestone. |
| Raise `lib` branch coverage from 92.04% toward 94%, focusing on hotels-catalog, price-cache, catalog-candidates, cheaper-dates, Wikivoyage, KV, and provider delivery branches. | DONE | Real; coverage passed far above this milestone. |
| Raise `lib` branch coverage from 94.17% toward 96%, focusing on hotels-catalog, Overpass POI, Wikidata enrichment, health readiness, ops scorecard, Ticketmaster, alert delivery, weather, and Wikipedia branches. | DONE | Real; coverage passed far above this milestone. |
| Raise `lib` branch coverage from 96.16% toward 97%, focusing on hotels-catalog, ops alerts, provider observability, Nominatim, public URL safety, health readiness, and remaining API error branches. | DONE | Real; coverage passed far above this milestone. |
| Raise `lib` branch coverage from 97% toward 98%, focusing on hotels-catalog, provider observability, price-cache, catalog-candidates, agent utilities, webhook URL, storage, and remaining API error branches. | DONE | Real; coverage passed far above this milestone. |
| Raise `lib` branch coverage from 98% toward 99%, focusing on hotels-catalog, provider observability, price-cache, catalog-candidates, storage, and remaining API/network error branches. | DONE | Real; later ratcheting completed `lib` branch coverage to 100%. |
| Raise `lib` branch coverage beyond 99.1%, focusing on provider observability and catalog media edge branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` branch coverage toward 99.3%, focusing on remaining private/inaccessible hotels-catalog, price-cache, URL-safety, auth, and API/network error branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` branch coverage toward 99.5%, focusing on remaining private/inaccessible hotels-catalog, webhook URL, auth, hotel-popularity, URL-safety, and API/network error branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` branch coverage toward 99.6%, focusing on remaining private/inaccessible hotels-catalog, auth, hotel-popularity, Xotelo, ops-alerts, cheaper-dates, Wikivoyage, Ticketmaster, and price-cache branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` branch coverage toward 99.7%, focusing on remaining private/inaccessible hotels-catalog, auth, hotel-popularity, agent-utils, Xotelo, ops-alerts, webhook URL, price-cache, and cheaper-dates branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` branch coverage toward 99.8%, focusing on remaining private/inaccessible hotels-catalog, hotel-popularity, ops-alerts, webhook URL, and price-cache branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` branch coverage toward 99.9%, focusing on remaining private/inaccessible hotels-catalog, hotel-popularity, ops-alerts, webhook URL, and price-cache branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` branch coverage to 100%, focusing on the remaining private/inaccessible hotels-catalog, ops-alerts, and webhook URL branches. | DONE | Real and verified at 100% branches. |
| Raise `lib` line/function coverage closer to 100%, focusing on remaining uncovered functions/lines without fake tests. | DONE | Real and verified at 100% lines, statements, functions, and branches. |
| Add focused tests for Overpass discovery, agent utilities, i18n edge cases, ops alert thresholds, and provider registry merge/circuit-breaker branches. | DONE | Real; matching tests exist across discovery, provider registry, i18n, ops alerts, and merge/circuit-breaker paths. |
| Surface reused catalog image risk in ops scorecard and release documentation. | DONE | Real; `lib/catalog-media-quality.js`, ops scorecard, docs, and tests expose the blocker. |
| Add public data contract audit for source/unavailable states across public data APIs. | DONE | Real; `audit:public-data-contracts` is CI-wired and checks compare, destination intel, weather, exchange-rate, holiday, city-info, events, POI, travel guide, price history, review, and property-content contracts. |
| Add a stronger provenance wiring audit for catalog candidate promotion, source URLs, provider links, and provider-returned rates. | DONE | Real for wiring and safe URLs; approved licensed image replacement remains a separate launch task. |
| Extend provenance audit to require licensed/source metadata for every legacy static catalog item and catalog image. | DONE | Real for metadata enforcement: `buildStaticCatalogProvenanceLedger`, `audit:provenance`, and tests require source URL/host/license-status metadata without pretending the images are approved licensed replacements. |
| Add deployment smoke checks for public APIs, protected admin APIs, cron guards, and unavailable-state behavior. | DONE | Real as a script and audit; not production proof until run against a configured deployment. |
| Expand catalog ingestion through the admin candidate workflow only; do not auto-promote discovered hotels. | DONE | Real locally: `audit:provenance` now requires discovery agents to write candidate queues and blocks direct catalog promotion outside explicit admin approval. |
| Add duplicate/provenance review summaries to the admin catalog candidate APIs and dashboard. | DONE | Real; candidate API/dashboard summaries and tests exist. |
| Add provider coverage telemetry by city/country/date so gaps are measurable before claims are displayed. | DONE | Real; provider coverage is derived from verified observation ledgers and returns insufficient-data when empty. |
| Surface ops scorecard, alert counts, domain status, and top blockers in the authenticated dashboard. | DONE | Real; dashboard and ops scorecard surfaces exist. |
| Add CI-wired RUM/Web Vitals wiring audit for Vercel Analytics, Speed Insights, and local Core Web Vitals instrumentation. | DONE | Real as local wiring audit; production RUM evidence is still missing. |
| Add international localization QA beyond Hebrew/English, including RTL/LTR layout regression checks. | DONE | Real as QA-only locale coverage: `LOCALE_QA_MATRIX`, `buildLocaleQaReport`, `audit:i18n`, unit tests, and Playwright checks exercise Arabic RTL plus French LTR without claiming translated content is complete. |
| Add CI-wired legal readiness audit for privacy, terms, cookie consent, affiliate safety, and provider-handoff disclosures. | DONE | Real as a local audit; it is not legal approval. |
| Add sourced competitor parity tracking for inventory breadth, price freshness, mobile installability, reviews, alerts, booking handoff quality, and Israel coverage. | DONE | Real as local scorecard tracking; weekly live review and production proof are still missing. |
| FAKED | None identified | I found no checked item that is only echoed or simulated. The weakness is not fake completion; it is local-only completion without production proof on several related outcomes. |

## Unfinished Launch Task Queue

These are the remaining tasks required to complete the full plan. Items blocked by secrets, contracts, licensing, or a real deployment cannot be finished safely inside the repo with placeholders.

| Open item | Status | Execution detail |
| --- | --- | --- |
| Configure real deployment env: `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis, Kinde, and at least one complete partner pricing provider group. | NOT DONE | Configure real values in deployment only; never commit or invent them. |
| Run `npm run audit:production:strict` in the deployment environment and capture the passing release evidence. | NOT DONE | Requires the real deployment env above. |
| Verify deployed cron routes with real `CRON_SECRET`: orchestrate, price-alert evaluation, and ops-alert evaluation. | NOT DONE | Requires deployed cron and real secret. |
| Configure persistent KV and verify `/api/health` reports persistent cache, not memory. | NOT DONE | Requires Upstash Redis or compatible durable KV in deployment. |
| Configure one approved pricing partner and verify provider-returned rates from production without fabricated fallbacks. | NOT DONE | Requires partner credentials and production smoke evidence. |
| Configure licensed review/property-content provider access before showing review copy, ratings, or rich property descriptions. | NOT DONE | Requires licensed provider contract and integration. |
| Run `SITE_URL=https://your-deployment.example npm run smoke:deployment` after strict production readiness passes. | NOT DONE | Requires configured deployment URL. |
| Replace reused catalog images with licensed hotel- or city-specific media. | NOT DONE | Requires approved media sources and license metadata; `npm run catalog:media:ledger` identifies every image source, city, hotel, and reason needing review. |
| Run deployment smoke checks in a configured production deployment and capture passing evidence. | NOT DONE | Requires deployment env and `SITE_URL`. |
| Exercise duplicate detection and provenance review workflows at production-scale candidate volume after persistent KV/provider ingestion is live. | NOT DONE | Requires persistent KV and real candidate ingestion volume. |
| Add real alert delivery provider integration for price alerts, unsubscribe tokens, and ops alerts. | NOT DONE | Webhook logic exists, but no approved provider/env is configured. |
| Add web push only after approved notification-provider setup and health readiness proof. | NOT DONE | Requires push provider and real VAPID keys. |
| Build the external production observability layer covering uptime, provider latency, cache hit rate, alert delivery, price mismatch reports, catalog provenance quality, RUM, and webhook proof. | PARTIAL | Internal endpoints exist; external monitoring proof is missing. |
| Capture production RUM/Core Web Vitals evidence per top route and device class. | NOT DONE | Requires deployed traffic/analytics evidence. |
| Capture partner terms, affiliate/legal review, and licensed content display signoff. | NOT DONE | Requires external approval; local audit is not approval. |
| Run weekly competitor source review and live production proof before treating parity status as launch evidence. | NOT DONE | Requires scheduled review process and production metrics. |

## Stabilization Priorities

1. **Production env gate**
   - Configure real `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis env, Kinde env, and at least one partner pricing provider.
   - Treat `npm run audit:production:strict` as the go-live blocker.

2. **Release hygiene**
   - Review all modified, deleted, and untracked files before staging new work.
   - Split unrelated work into reviewable commits if the diff remains broad.
   - Keep generated/cache artifacts out of commits.

3. **Coverage ratchet**
   - Keep the `lib` line, statement, function, and branch coverage floors at 100%.
   - Add app/runtime coverage where new production behavior is added, without fake tests or weakening production guards.
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
- `npm audit --omit=dev --audit-level=moderate` reports no production dependency vulnerabilities in an approved network environment; the full audit result is reviewed and documented separately.
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
- [x] Raise `lib` branch coverage from 96.16% toward 97%, focusing on hotels-catalog, ops alerts, provider observability, Nominatim, public URL safety, health readiness, and remaining API error branches.
- [x] Raise `lib` branch coverage from 97% toward 98%, focusing on hotels-catalog, provider observability, price-cache, catalog-candidates, agent utilities, webhook URL, storage, and remaining API error branches.
- [x] Raise `lib` branch coverage from 98% toward 99%, focusing on hotels-catalog, provider observability, price-cache, catalog-candidates, storage, and remaining API/network error branches.
- [x] Raise `lib` branch coverage beyond 99.1%, focusing on provider observability and catalog media edge branches.
- [x] Raise `lib` branch coverage toward 99.3%, focusing on remaining private/inaccessible hotels-catalog, price-cache, URL-safety, auth, and API/network error branches.
- [x] Raise `lib` branch coverage toward 99.5%, focusing on remaining private/inaccessible hotels-catalog, webhook URL, auth, hotel-popularity, URL-safety, and API/network error branches.
- [x] Raise `lib` branch coverage toward 99.6%, focusing on remaining private/inaccessible hotels-catalog, auth, hotel-popularity, Xotelo, ops-alerts, cheaper-dates, Wikivoyage, Ticketmaster, and price-cache branches.
- [x] Raise `lib` branch coverage toward 99.7%, focusing on remaining private/inaccessible hotels-catalog, auth, hotel-popularity, agent-utils, Xotelo, ops-alerts, webhook URL, price-cache, and cheaper-dates branches.
- [x] Raise `lib` branch coverage toward 99.8%, focusing on remaining private/inaccessible hotels-catalog, hotel-popularity, ops-alerts, webhook URL, and price-cache branches.
- [x] Raise `lib` branch coverage toward 99.9%, focusing on remaining private/inaccessible hotels-catalog, hotel-popularity, ops-alerts, webhook URL, and price-cache branches.
- [x] Raise `lib` branch coverage to 100%, focusing on the remaining private/inaccessible hotels-catalog, ops-alerts, and webhook URL branches.
- [x] Raise `lib` line/function coverage closer to 100%, focusing on remaining uncovered functions/lines without fake tests.
- [x] Add focused tests for Overpass discovery, agent utilities, i18n edge cases, ops alert thresholds, and provider registry merge/circuit-breaker branches.
- [x] Surface reused catalog image risk in ops scorecard and release documentation.
- [x] Add public data contract audit for source/unavailable states across public data APIs.
- [ ] Replace reused catalog images with licensed hotel- or city-specific media.
- [x] Add a stronger provenance wiring audit for catalog candidate promotion, source URLs, provider links, and provider-returned rates.
- [x] Extend provenance audit to require licensed/source metadata for every legacy static catalog item and catalog image.
- [x] Add deployment smoke checks for public APIs, protected admin APIs, cron guards, and unavailable-state behavior.
- [ ] Run deployment smoke checks in a configured production deployment and capture passing evidence.

### P2: Market Scale

- [x] Expand catalog ingestion through the admin candidate workflow only; do not auto-promote discovered hotels.
- [x] Add duplicate/provenance review summaries to the admin catalog candidate APIs and dashboard.
- [ ] Exercise duplicate detection and provenance review workflows at production-scale candidate volume after persistent KV/provider ingestion is live.
- [x] Add provider coverage telemetry by city/country/date so gaps are measurable before claims are displayed.
- [ ] Add real alert delivery provider integration for price alerts, unsubscribe tokens, and ops alerts.
- [ ] Add web push only after approved notification-provider setup and health readiness proof.

### P3: Number-One Product Work

- [x] Surface ops scorecard, alert counts, domain status, and top blockers in the authenticated dashboard.
- [ ] Build the external production observability layer covering uptime, provider latency, cache hit rate, alert delivery, price mismatch reports, catalog provenance quality, RUM, and webhook proof.
- [x] Add CI-wired RUM/Web Vitals wiring audit for Vercel Analytics, Speed Insights, and local Core Web Vitals instrumentation.
- [ ] Capture production RUM/Core Web Vitals evidence per top route and device class.
- [x] Add international localization QA beyond Hebrew/English, including RTL/LTR layout regression checks.
- [x] Add CI-wired legal readiness audit for privacy, terms, cookie consent, affiliate safety, and provider-handoff disclosures.
- [ ] Capture partner terms, affiliate/legal review, and licensed content display signoff.
- [x] Add sourced competitor parity tracking for inventory breadth, price freshness, mobile installability, reviews, alerts, booking handoff quality, and Israel coverage.
- [ ] Run weekly competitor source review and live production proof before treating parity status as launch evidence.

## Detailed Execution Plan

| Phase | Substeps | Exit criteria |
| --- | --- | --- |
| 0. Production truth | Configure real admin/cron secrets, Upstash, Kinde, one partner pricing provider, licensed review/property provider, and alert delivery provider. | `npm run audit:production:strict` passes in deployment without placeholder values. |
| 1. Deployment proof | Deploy, run public API smoke checks, protected admin checks, cron checks, unavailable-state checks, cache durability checks, and provider-returned rate checks. | Health reports persistent cache, partner provider configured, and no fabricated fallback data. |
| 2. Trust and provenance | Add source/provenance coverage for catalog entries, catalog images, provider links, price observations, review snippets, and property content. | A provenance audit fails any new item that cannot be traced to an allowed source or licensed provider. |
| 3. Quality ratchet | Preserve the 100% `lib` coverage ratchet and add app/runtime coverage for new behavior, focusing on catalog, provider observability, cache, URL-safety, auth, storage, and network failure paths. | Coverage floors stay at 100% for tracked `lib` code and CI blocks regression. |
| 4. Content scale | Expand inventory only through candidate ingestion, duplicate detection, source review, admin approval, and licensed media replacement. | Catalog grows without fake items, duplicate identities, unsafe URLs, or reused unlicensed media. |
| 5. Product parity | Add provider coverage matrix, price freshness, alert delivery, mobile push, RUM, Core Web Vitals, competitor parity dashboard, and legal/commercial signoff. | Product can be compared against Booking, Google Travel, KAYAK/HotelsCombined, Expedia, trivago, Fattal, and Isrotel with sourced metrics instead of manual claims. |
| 6. Number-one loop | Run weekly competitor audits, source-quality audits, conversion/drop-off analysis, support-risk review, and pricing accuracy drift review. | The roadmap is driven by measured gaps in inventory, freshness, trust, speed, mobile retention, and booking handoff quality. |

## Non-Negotiables

- Never use `Math.random()`.
- Never display fabricated hotel, review, price, provider, urgency, availability, or production-readiness data.
- Never use invented secrets to make readiness checks pass.
- If a provider, credential, review license, or data source is missing, show the missing state explicitly.
