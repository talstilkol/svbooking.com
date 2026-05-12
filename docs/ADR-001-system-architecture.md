# ADR-001: SV Booking System Architecture

**Status:** Accepted
**Date:** 2026-05-12
**Deciders:** Engineering Team

---

## Context

SV Booking is a hotel price comparison platform. The system needs to:
- Compare hotel prices from multiple providers in real time
- Provide rich travel content (safety, events, weather, POIs) at zero API cost
- Scale from 134 hotels to thousands without adding infrastructure
- Run background agents to keep data fresh with minimal cost
- Deploy on Vercel Hobby tier (serverless, no persistent processes)

## Decision

A **serverless-first, cache-heavy architecture** built on Next.js 16 App Router with Upstash Redis as the sole persistence layer and 12 autonomous background agents.

---

## System Architecture

```
                          +------------------+
                          |   Vercel Edge    |
                          |   (proxy.ts)     |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |                              |
             +------+------+              +-------+-------+
             |  18 Pages   |              | 44 API Routes |
             |  (CSR/SSG)  |              |  (Serverless) |
             +------+------+              +-------+-------+
                    |                              |
             +------+------+              +-------+-------+
             | 119 React   |              |   7 Pricing   |
             | Components  |              |   Providers   |
             +-------------+              +-------+-------+
                                                   |
                                          +--------+--------+
                                          |  Upstash Redis  |
                                          |  (KV Cache)     |
                                          +--------+--------+
                                                   |
                                          +--------+--------+
                                          | 12 Background   |
                                          | Agents (Cron)   |
                                          +-----------------+
```

### Layer 1: Edge Routing (proxy.ts)
- Kinde OAuth for protected routes
- Public/private path split (53 public paths)
- Redirects to login on auth failure (hardened)

### Layer 2: Pages (18 routes)
- CSR (`'use client'`) for all interactive pages
- SSG for 46 city pages via `generateStaticParams`
- Dynamic routing: `/hotel/[key]`, `/city/[name]`, `/book/[id]`

### Layer 3: API Layer (44 routes)
- **Core**: search, compare, deals, cheaper-dates
- **Content**: weather, city-info, holidays, events, POIs, travel-guide, hotel-amenities
- **Catalog**: discover, discover-osm, validate, stats
- **User**: favorites, prefs, trips
- **Agents**: 12 auto-agents + orchestrator + status + health-check

### Layer 4: Pricing Providers (7 adapters)
```
hotel-pricing.js (aggregator)
  |-- xotelo-provider.js       (primary, free, no auth)
  |-- serpapi-provider.js       (Google Hotels, 250/mo free)
  |-- booking-provider.js      (via RapidAPI, 500/mo free)
  |-- tripadvisor-provider.js  (via RapidAPI, 500/mo free)
  |-- makcorps-provider.js     (Hotels.com, 100/mo free)
  |-- amadeus-provider.js      (GDS hotel offers)
  |-- heatmap-provider.js      (pricing heatmaps)
  |-- registry.js              (provider health, circuit breakers)
```
- **Race-based fallback**: `Promise.any` on top 3 healthy providers
- **Circuit breakers**: auto-disable failing providers, auto-reset after cooldown
- **Trust scores**: per-provider reliability tracking

### Layer 5: Data Sources (18 external APIs)

| Source | Data | Auth | Rate Limit |
|--------|------|------|------------|
| Xotelo | Hotel prices/heatmaps | None | Generous |
| SerpApi | Google Hotels prices | API key | 250/mo |
| Booking.com | Hotel search | RapidAPI | 500/mo |
| TripAdvisor | Hotel details | RapidAPI | 500/mo |
| Makcorps | Hotels.com prices | RapidAPI | 100/mo |
| Amadeus | GDS hotel offers | OAuth2 | 500/mo |
| Overpass/OSM | Hotels, POIs, amenities | None | 200 req/s |
| OpenTripMap | Tourism POIs + ratings | None | Generous |
| Wikivoyage | Travel guides, safety | None | 200 req/s |
| Wikipedia | City/hotel descriptions | None | 200 req/s |
| Wikidata | Hotel metadata (SPARQL) | None | Generous |
| DBpedia | Hotel metadata (SPARQL) | None | Generous |
| Open-Meteo | Weather forecasts | None | Unlimited |
| Nominatim | Geocoding | None | 1 req/s |
| Ticketmaster | Live events | API key (opt) | 5000/day |
| ipapi.co | IP geolocation | None | 1000/day |
| date.nager.at | Public holidays | None | Generous |
| open.er-api.com | Exchange rates | None | Generous |

### Layer 6: Caching (Upstash Redis)
- **No traditional database** — all state is KV
- Price rates: 30 min TTL
- Price heatmaps: 2 hour TTL
- POIs/attractions: 7 day TTL
- Hotel amenities: 30 day TTL
- Travel guides: 7 day TTL
- Agent status: 24 hour TTL
- In-memory fallback (5000 LRU cap) for local dev

### Layer 7: Background Agents (12 autonomous)

```
Orchestrator (daily cron, 6:00 UTC)
  |
  |-- 1. Provider Manager    (5-10s)   reset circuit breakers
  |-- 2. Health Monitor      (5-10s)   check all data sources
  |-- 3. Enrichment          (30s)     Wikipedia/Wikidata enrichment
  |-- 4. Discovery           (30s)     city-by-city hotel discovery
  |-- 5. Bulk Discovery      (60s)     Wikidata SPARQL expansion
  |-- 6. OSM Scanner         (60s)     OpenStreetMap hotel scan
  |-- 7. Xotelo Discovery    (30s)     Xotelo catalog search
  |-- 8. Price Cache         (2-5m)    warm prices for all hotels
  |-- 9. Deal Scanner        (2-5m)    find best deals
  |-- 10. POI Cache          (2-5m)    warm attractions/restaurants
  |-- 11. Travel Guide Cache (1-2m)    warm safety/events/dining
  |-- 12. Events Cache       (30s)     warm Ticketmaster events
```

Execution: sequential, fault-isolated (one failure doesn't block others).
Auto-merges discovered hotels into runtime catalog after each run.

---

## Key Design Decisions

### 1. KV-Only Persistence (No Database)
**Why:** Vercel Hobby has no persistent DB. All data is either:
- Hardcoded in catalog (134 hotels) — expandable at runtime
- Cached from external APIs with TTLs
- Stored per-user in KV (`user:{uid}:prefs`, `user:{uid}:favorites`)

**Trade-off:** No complex queries, no relational joins. But zero DB cost and instant global reads via Upstash.

### 2. Race-Based Provider Fallback
**Why:** No single pricing API is reliable. `Promise.any` on the top 3 providers means if one is slow/down, we get the fastest response. Circuit breakers prevent wasting time on known-bad providers.

### 3. Static Catalog + Runtime Discovery
**Why:** 134 manually curated hotels give consistent UX. Background agents expand the catalog at runtime via Wikidata/OSM/Xotelo discovery. No cold-start database seeding needed.

### 4. Free/Open Data Stack
**Why:** 14 of 18 API integrations require zero authentication. Operating cost is Vercel hosting + Upstash Redis only. No per-query charges.

---

## Consequences

### What becomes easier
- Adding new data sources (established pattern: lib module + API route + agent)
- Scaling to new cities (just add to catalog, agents pre-warm automatically)
- Zero infrastructure management (serverless + managed KV)

### What becomes harder
- Complex queries (no SQL, no joins across entities)
- Real-time updates (cron-based, not WebSocket)
- Debugging data staleness (multiple cache layers with different TTLs)

### What we'll need to revisit
- CSR-only pages hurt SEO — migrate to server components
- 134-hotel catalog needs 100x scaling for production viability
- No unit tests — need test infrastructure before major refactors
- Rate limiting needed on public API routes

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router + Turbopack) | 16.2.6 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Animation | Framer Motion | 12.38.0 |
| Auth | Kinde | 2.12.1 |
| Cache/DB | Upstash Redis | 1.38.0 |
| Testing | Playwright (E2E) | 1.59.1 |
| Deploy | Vercel (Hobby) | Serverless |
| Cron | Vercel Cron | Daily |

---

## Deployment

- **Production URL:** https://my-app-alpha-one-28.vercel.app
- **GitHub:** https://github.com/talstilkol/svbooking.com
- **Build time:** ~54 seconds
- **Static pages:** 110 (SSG)
- **Dynamic routes:** 44 API + 3 page routes
- **Cron:** Daily at 6:00 UTC (orchestrator)
