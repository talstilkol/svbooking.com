# SV Booking Production Stabilization Plan

## Current State

The app is locally healthy but not production-ready until real deployment configuration is present.

| Area | Score | Current status |
| --- | ---: | --- |
| Determinism and no-fabrication guardrails | 10/10 | `Math.random()` and unapproved UUID randomness are blocked; unavailable data is shown instead of generated claims. |
| Local build/test health | 10/10 | Lint, unit/API tests, build, and E2E are expected release gates. |
| Coverage depth | 8/10 | `npm run audit:coverage` now enforces a ratchet floor; current `lib` coverage is about 83% lines and 70% branches. |
| Security guardrails | 9/10 | Admin bearer auth, CSRF checks, HTML-safety, storage, privacy, alert, and no-store audits are wired. |
| Catalog quality | 7/10 | 502 curated hotels across 139 cities and 65 countries; clears the local floor, still far below market-scale coverage. |
| Provider coverage | 6/10 | Six pricing adapters exist, but production needs real configured partner credentials beyond the no-auth baseline. |
| Reviews and property content | 5/10 | APIs return explicit unavailable states until licensed provider data is configured. |
| Mobile retention | 6/10 | PWA/offline shell and local alerts exist; push delivery env is not configured. |
| Production readiness | 5/10 | Strict readiness fails without admin, cron, Redis, Kinde, and partner-provider env. |
| Release hygiene | 10/10 | The worktree is clean; keep generated/cache artifacts out of commits. |

## Stabilization Priorities

1. **Production env gate**
   - Configure real `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis env, Kinde env, and at least one partner pricing provider.
   - Treat `npm run audit:production:strict` as the go-live blocker.

2. **Release hygiene**
   - Review all modified, deleted, and untracked files before staging new work.
   - Split unrelated work into reviewable commits if the diff remains broad.
   - Keep generated/cache artifacts out of commits.

3. **Coverage ratchet**
   - Raise `lib` branch coverage from 70% toward 80%, then raise the ratchet floors again in `scripts/audit-coverage.mjs`.
   - Prioritize provider registry, cache, admin auth, cron auth, URL validation, alert delivery, retention edge cases, and UI hook branches.
   - Keep coverage reports out of commits unless a reviewed artifact is explicitly requested.

4. **Docs and drift prevention**
   - Keep `README.md`, `.env.example`, `PRODUCTION-RUNBOOK.md`, and this plan aligned with actual routes and scripts.
   - Run `npm run audit:docs` in CI so removed routes and stale architecture claims do not return.

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

## Non-Negotiables

- Never use `Math.random()`.
- Never display fabricated hotel, review, price, provider, urgency, availability, or production-readiness data.
- Never use invented secrets to make readiness checks pass.
- If a provider, credential, review license, or data source is missing, show the missing state explicitly.
