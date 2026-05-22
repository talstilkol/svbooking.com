# SV Booking Production Stabilization Plan

## Current State

The app is locally healthy but not production-ready until real deployment configuration is present.

| Area | Score | Current status |
| --- | ---: | --- |
| Determinism and no-fabrication guardrails | 10/10 | `Math.random()` and unapproved UUID randomness are blocked; unavailable data is shown instead of generated claims. |
| Local build/test health | 10/10 | Lint, unit/API tests, build, and E2E are expected release gates. |
| Security guardrails | 9/10 | Admin bearer auth, CSRF checks, HTML-safety, storage, privacy, alert, and no-store audits are wired. |
| Catalog quality | 6/10 | 133 curated hotels across 46 cities and 32 countries; useful for validation, still far below market-scale coverage. |
| Provider coverage | 6/10 | Six pricing adapters exist, but production needs real configured partner credentials beyond the no-auth baseline. |
| Reviews and property content | 5/10 | APIs return explicit unavailable states until licensed provider data is configured. |
| Mobile retention | 6/10 | PWA/offline shell and local alerts exist; push delivery env is not configured. |
| Production readiness | 5/10 | Strict readiness fails without admin, cron, Redis, Kinde, and partner-provider env. |
| Release hygiene | 5/10 | The worktree contains broad uncommitted changes and needs review before staging or deployment. |

## Stabilization Priorities

1. **Production env gate**
   - Configure real `ADMIN_API_SECRET`, `CRON_SECRET`, Upstash Redis env, Kinde env, and at least one partner pricing provider.
   - Treat `npm run audit:production:strict` as the go-live blocker.

2. **Release hygiene**
   - Review all modified, deleted, and untracked files before staging.
   - Split unrelated work into reviewable commits if the diff remains broad.
   - Keep generated/cache artifacts out of commits.

3. **Docs and drift prevention**
   - Keep `README.md`, `.env.example`, `PRODUCTION-RUNBOOK.md`, and this plan aligned with actual routes and scripts.
   - Run `npm run audit:docs` in CI so removed routes and stale architecture claims do not return.

4. **Market readiness**
   - Promote only validated catalog candidates with real hotel keys and source provenance.
   - Add licensed reviews and property-content provider integrations before displaying ratings or review copy.
   - Keep all unknown data as unavailable/not configured.

5. **Operations**
   - Run agent cron routes only with `CRON_SECRET`.
   - Monitor `/api/health`, `/api/ops/scorecard`, `/api/ops/alerts`, provider uptime, price-accuracy metrics, and alert delivery history.
   - Keep dependency auditing in an approved environment because `npm audit` sends dependency metadata to the npm registry.

## Acceptance Criteria

- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.
- `npm run test:e2e` passes.
- Every `npm run audit:*` script passes except `audit:production:strict` in intentionally unconfigured local shells.
- `npm run audit:production:strict` passes in the deployment environment before launch.
- README and plan contain the current catalog count: 133 hotels, 46 cities, 32 countries.
- No documentation references removed listing/booking API routes, old database architecture, old 15-hotel coverage, or unsupported no-auth/no-rate-limit claims.

## Non-Negotiables

- Never use `Math.random()`.
- Never display fabricated hotel, review, price, provider, urgency, availability, or production-readiness data.
- Never use invented secrets to make readiness checks pass.
- If a provider, credential, review license, or data source is missing, show the missing state explicitly.
