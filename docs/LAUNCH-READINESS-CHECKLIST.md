# SV Booking Launch Readiness Checklist

Snapshot date: 2026-06-17.

This checklist turns the master plan into an execution queue. It is intentionally evidence-based: do not mark an item complete from local code alone when the item requires deployment secrets, licensed providers, legal approval, or production runtime proof.

## 1. Current Baseline

| Area | Current state | Required next proof |
| --- | --- | --- |
| Worktree | Clean before the master-plan update; now only planning docs are expected to be changed. | `npm run release:state` before staging or deployment. |
| Master plan | `npm run audit:master-plan` passed after the continuation plan was added. | Keep the plan, README, runbook, and audit report aligned. |
| Docs | `npm run audit:docs` passed with 502 hotels, 139 cities, 65 countries. | Re-run after docs or route/env changes. |
| Production readiness | `npm run audit:production` reports `productionReady: false`. | Run `npm run audit:production:strict` only in a configured deployment env. |
| Catalog media | 112 media actions across 502 hotel references; 6 image sources are reused across too many cities. | Replace or approve media with real source/license metadata. |

## 2. P0 Production Environment

| Item | Why it blocks launch | Evidence to capture |
| --- | --- | --- |
| `ADMIN_API_SECRET` | Admin and ops APIs must fail closed without a real secret. | Deployment env configured; protected admin smoke passes. |
| `CRON_SECRET` | Scheduled agents must not run from unauthenticated requests. | Cron routes reject missing/wrong bearer and accept the real secret. |
| Upstash Redis env | Agents, candidate queues, alerts, cache, and audit logs need durable storage. | `/api/health` reports persistent cache, not memory fallback. |
| Kinde env | User auth and protected pages need real production auth. | Login/logout flow works on the deployment domain. |
| One complete partner pricing provider | Production cannot depend only on unauthenticated baseline behavior. | Provider-returned rates appear with source/provenance and no fabricated fallback. |

## 3. P0 Launch Services

| Item | Required env or artifact | Evidence to capture |
| --- | --- | --- |
| Licensed review/property provider | `REVIEWS_PROVIDER_NAME`, `REVIEWS_PROVIDER_LICENSED`, and provider key such as `GOOGLE_PLACES_API_KEY`. | Review/property APIs return provider-backed data only when licensed; otherwise explicit unavailable states remain. |
| Price alert delivery | `PRICE_ALERT_WEBHOOK_URL`, `PRICE_ALERT_WEBHOOK_SECRET`, `PRICE_ALERT_UNSUBSCRIBE_SECRET`. | Triggered alert sends sanitized payload with deterministic unsubscribe token. |
| Ops alert delivery | `OPS_ALERT_WEBHOOK_URL`, `OPS_ALERT_WEBHOOK_SECRET`. | `/api/ops/alerts/evaluate` stores sanitized delivery events and sends only warning/critical payloads. |
| Push readiness | `NEXT_PUBLIC_PUSH_PUBLIC_KEY`, `PUSH_PRIVATE_KEY`, and approved notification provider. | `/api/health` reports push readiness; PWA audit remains green. |
| Commercial/legal approval | Partner terms, affiliate/legal review, licensed content display signoff. | External approval record linked in the release evidence. |

## 4. Catalog Media Approval Queue

The catalog media blocker has two layers:

1. 112 image sources need approved license metadata or replacement.
2. 6 image sources are reused across too many cities and should be handled first because they reduce catalog trust.

Priority reused sources:

| Source URL | Current reuse | Affected cities | Required action |
| --- | ---: | --- | --- |
| `https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80` | 5 cities | Accra, Addis Ababa, Dar es Salaam, Lagos, Nairobi | Replace with city- or hotel-specific licensed media, or attach approved license metadata if legally valid. |
| `https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80` | 4 cities | Cusco, Granada, Lima, Machu Picchu | Replace or approve with evidence. |
| `https://images.unsplash.com/photo-1549927681-0b673b8243ab?w=800&q=80` | 3 cities | Doha, Kuwait City, Manama | Replace or approve with evidence. |
| `https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80` | 3 cities | Berlin, Tallinn, Vilnius | Replace or approve with evidence. |
| `https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80` | 3 cities | Crete, Mykonos, Santorini | Replace or approve with evidence. |
| `https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80` | 3 cities | Barcelona, Ibiza, Palma de Mallorca | Replace or approve with evidence. |

Rules for media completion:

1. Do not set `approvedLicense: true` unless the source/license approval is real.
2. Do not use generated or placeholder images as hotel evidence.
3. Prefer hotel-specific official/partner media when licensed; otherwise use city-specific media only when the page is city-level and the source license is approved.
4. Keep `replacementRequired: true` until a replacement or approval is verified.
5. Use `npm run catalog:media:ledger:summary` to review the six reused-image priority sources first.
6. Use `npm run catalog:media:ledger:priority-csv` for the reused-source review queue.
7. Use `npm run catalog:media:ledger:csv` when the full media/legal review needs a tabular queue.
8. Use `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/catalog-media-action-ledger.mjs --format=csv --city=Berlin` to focus review on a specific city.
9. Re-run `npm run catalog:media:ledger`, `npm run audit:catalog-media-ledger`, and `npm run audit:production` after each batch.

## 5. Deployment Verification Flow

Use this order because each step depends on the previous proof.

```bash
npm run launch:readiness:report
npm run audit:launch-readiness-report
npm run release:state
npm run audit:master-plan
npm run audit:docs
npm run audit:guardrails
npm run audit:provenance
npm run audit:catalog-media-ledger
npm run audit:production
```

Before a deployment candidate:

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

In the configured deployment environment:

```bash
npm run audit:production:strict
SITE_URL=https://your-deployment.example npm run smoke:deployment
```

Only run cron smoke intentionally:

```bash
SITE_URL=https://your-deployment.example SMOKE_RUN_CRON=1 npm run smoke:deployment
```

## 6. Typecheck Gate

`npm run typecheck` is now green and wired into CI. Treat it as a release gate.

Use this read-only report only when investigating a future regression:

```bash
npm run typecheck:debt:report
npm run typecheck:debt:report -- --format=json --limit=10
```

Rules:

1. Keep `npm run typecheck` green before deployment candidates.
2. If it regresses, fix high-count files first because they reduce the most noise.
3. Prefer updating test fixtures to match runtime contracts instead of weakening production types.
4. After each batch, run `npm run typecheck` and the focused tests for the touched files.

## 7. Status Rules

| Status | Meaning |
| --- | --- |
| DONE | Verified by code, local audit, deployment evidence, or external approval matching the item type. |
| PARTIAL | Wiring exists, but production proof, licensed provider, legal approval, or runtime evidence is missing. |
| NOT DONE | No real evidence exists yet. |
| BLOCKED | The next action requires a secret, provider account, license, legal decision, or deployment access that is unavailable in the repo. |

Do not downgrade unavailable states into optimistic UI. Unknown provider, review, property, price, urgency, availability, push, and readiness data must remain explicit unavailable/not configured states.
