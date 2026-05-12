# SV Booking — Comprehensive System Audit Report

**Date:** 2026-05-12
**Version:** 0.1.0
**Files scanned:** 282 source files
**Bugs found:** 20 | **Fixed:** 9 critical/high | **Remaining:** 11 low/medium

---

## Executive Summary

SV Booking is a hotel price comparison platform with 134 hotels across 46 cities, 7 pricing providers, 12 background agents, and 25+ free data source integrations. The architecture is solid and feature-rich for an early-stage product. However, critical gaps in **inventory scale**, **SSR/SEO**, **security hardening**, and **testing** hold it back from competing with established players.

**Overall Score: 6.5/10** (up from 5.8 after the 9 bug fixes applied in this audit)

---

## Part 1: Bug Audit

### Critical Bugs Fixed

| # | Bug | File | Severity | Status |
|---|-----|------|----------|--------|
| 1 | **Auth bypass on error** — catch block allowed all requests through when auth service was unreachable | `proxy.ts:85` | Critical | FIXED |
| 2 | **Cron endpoints publicly accessible** — `verifyCronAuth()` allowed all requests when `CRON_SECRET` not set in production | `lib/agent-utils.js:163` | Critical | FIXED |
| 3 | **KV double-stringify** — Upstash Redis auto-serializes, but we called `JSON.stringify()` before `.set()`, corrupting data as double-encoded strings | `lib/kv.js:69,80` | High | FIXED |
| 4 | **Overpass QL injection** — City names and hotel names interpolated directly into queries without escaping quotes | `lib/overpass.js:29`, `lib/overpass-pois.js:123` | High | FIXED |
| 5 | **setState inside useMemo** — `setPage(1)` called during render, violating React rules | `app/search/page.tsx:68` | High | FIXED |
| 6 | **PriceDropAlert wrong localStorage key** — Read `'hotel-favorites'` but favorites stored at `'svbooking:favorites'`, making feature 100% broken | `components/PriceDropAlert.tsx:37` | High | FIXED |
| 7 | **Auth 401 returned as 500** — `requireUser()` threw plain Error with `.status = 401`, but `errorResponse()` only checked `ValidationError` | `lib/auth.js:13`, `lib/validation.js:34` | High | FIXED |
| 8 | **VALID_CURRENCIES too restrictive** — Only 4 currencies accepted in prefs API, but UI shows 14 | `app/api/me/prefs/route.js:9` | Medium | FIXED |
| 9 | **Missing city coordinates** — Only 20 of 46 catalog cities had coordinates, causing API failures for weather, POIs, events | `lib/city-coordinates.ts` | High | FIXED |

### Additional Bugs Fixed

| # | Bug | File | Status |
|---|-----|------|--------|
| 10 | **Missing security headers** — No X-Frame-Options, X-Content-Type-Options, Referrer-Policy | `next.config.ts` | FIXED |
| 11 | **Missing proxy routes** — New API routes `/api/pois`, `/api/events`, `/api/hotel-amenities`, `/api/travel-guide` not in public paths | `proxy.ts` | FIXED |
| 12 | **Error messages leak internals** — `errorResponse()` returned raw `err.message` to clients | `lib/validation.js:39` | FIXED |

### Remaining Bugs (Lower Priority)

| # | Bug | File | Severity |
|---|-----|------|----------|
| 13 | `detectCurrency` always returns USD due to `Intl.NumberFormat` misuse | `lib/currency.ts:39` | Medium |
| 14 | Stale closure in compare page useEffect | `app/compare/page.tsx:126` | Medium |
| 15 | SearchAutocomplete `useCallback` defeated by unstable `allItems` | `components/SearchAutocomplete.tsx:72` | Low |
| 16 | Book page fetches entire catalog to find one hotel | `app/book/[id]/page.tsx:21` | Low |
| 17 | `AnimatePresence` missing around rotating city text | `components/home/HomeHero.tsx` | Low |
| 18 | Division by zero risk when `nights = 0` | `app/hotel/[key]/page.tsx:259` | Low |
| 19 | Duplicate CSS `*:focus-visible` rules with conflicting colors | `app/globals.css:49,89` | Low |
| 20 | `npm audit`: 2 moderate PostCSS vulnerabilities (Next.js dependency) | `package.json` | Low |

---

## Part 2: Security Audit

### Vulnerability Summary

| Category | Count | Severity |
|----------|-------|----------|
| Broken Access Control | 2 | Critical (FIXED) |
| Injection | 1 | High (FIXED) |
| Security Misconfiguration | 2 | Medium (1 FIXED) |
| Missing Rate Limiting | 1 | Medium |
| Information Disclosure | 1 | Medium (FIXED) |
| Vulnerable Dependencies | 1 | Low |

### Security Score: 6/10 (post-fixes)

**Remaining security recommendations:**
1. **Add rate limiting** on public API routes (use `@upstash/ratelimit` — already have Upstash)
2. **Add Content-Security-Policy header** (complex, needs careful allowlisting)
3. **Cap radius/limit params** in `/api/pois` and `/api/events` to prevent external API abuse
4. **Add CSRF protection** for POST routes (`/api/me/*`, `/api/catalog/validate`)
5. **Require admin auth** for `/api/catalog/validate` and `/api/catalog/discover-osm`

---

## Part 3: Scoring by Category

| Category | Score | Details |
|----------|-------|---------|
| **Architecture** | 7/10 | Clean separation (app/components/lib), good provider abstraction, 12 background agents. Weakness: all pages are `'use client'` — no server-side data fetching. |
| **Performance** | 5/10 | Client-side waterfalls on search/hotel pages. Hero loads 4 unoptimized Unsplash images. `framer-motion` (140KB) loaded on homepage. Good: dynamic imports on hotel detail page, debounced search. |
| **SEO** | 7/10 | Full OpenGraph/Twitter meta, JSON-LD structured data, sitemap, robots.txt. Weakness: all pages render empty shells (CSR), search engines index blank HTML. |
| **Security** | 6/10 | Auth system with Kinde, cron auth (now hardened), input sanitization (now added). Weakness: no rate limiting, no CSP header. |
| **Data Sources** | 9/10 | 25+ free integrations (Overpass, OpenTripMap, Wikivoyage, Wikipedia, Wikidata, Open-Meteo, Ticketmaster, Nominatim, DBpedia, exchange rates, holidays). Excellent for zero-cost operation. |
| **Features** | 8/10 | Price comparison, cheaper dates, deals, city guides, safety, weather, events, POIs, amenities, trip planning, favorites, AI agent dashboard. Very feature-rich. |
| **UI/UX** | 7/10 | Clean Tailwind design, responsive, accessibility panel, mobile bottom bar, cookie consent. Weakness: no dark mode, some emoji-only buttons lack aria labels. |
| **Mobile** | 8/10 | Responsive grid patterns, MobileBottomBar, FilterDrawer. PWA manifest present. No native apps. |
| **Accessibility** | 7/10 | Skip-to-content, aria-labels on nav, keyboard escape handler, AccessibilityPanel. Weakness: no focus traps in modals, some color contrast issues. |
| **Error Handling** | 8/10 | Custom error.tsx, not-found.tsx, ErrorBoundary, loading states, AbortController in fetches. Good resilience. |
| **Caching** | 7/10 | KV with Redis/in-memory fallback, TTL support, HTTP Cache-Control headers. Weakness: no cache invalidation strategy, `keys()` can be expensive at scale. |
| **Testing** | 4/10 | 13 E2E test files only. Zero unit tests, zero component tests, zero API tests. |
| **i18n** | 2/10 | Hardcoded English only. No RTL support. Static `lang="en"`. Currency selector exists but no locale routing. |
| **Code Quality** | 7/10 | TypeScript for components, no TODO/FIXME comments, validation module. Some console.error in production, double-stringify bug was present. |
| **DevOps** | 7/10 | Vercel deploy, cron-based orchestrator, health monitoring agent. No CI/CD pipeline visible, no staging environment. |
| **OVERALL** | **6.5/10** | |

---

## Part 4: Competitor Comparison

### Feature Matrix

| Feature | SV Booking | Booking.com | Trivago | Kayak | Hotels.com | TripAdvisor | Google Hotels |
|---------|-----------|-------------|---------|-------|------------|-------------|---------------|
| **Inventory** | 134 hotels | Millions | Millions | Millions | Millions | Millions | Millions |
| **Price providers** | 7 | Own | 400+ | 200+ | Own | 200+ | 200+ |
| **Real-time pricing** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Cheaper dates** | Yes | Yes | No | Yes | No | No | Yes |
| **Price history** | Simulated | No | No | Yes | No | No | Yes |
| **User reviews** | Form only | Millions | Links | Links | Millions | Millions | Aggregated |
| **City guides** | Yes | Basic | No | No | No | Rich | Basic |
| **Safety info** | Yes | No | No | No | No | Yes | No |
| **Weather** | Yes | No | No | No | No | No | Yes |
| **Events** | Yes | No | No | No | No | Yes | Yes |
| **Nearby POIs** | Yes (OSM) | Limited | No | No | No | Yes | Yes |
| **Direct booking** | No (redirect) | Yes | No | No | Yes | No | No |
| **Loyalty program** | No | Genius | No | No | 1 free night | No | No |
| **Mobile app** | PWA | Native | Native | Native | Native | Native | Native |
| **AI agents** | Yes (12) | No | No | No | No | No | No |
| **Background refresh** | Every 6h | Real-time | Real-time | Real-time | Real-time | Real-time | Real-time |
| **Open data stack** | Yes | No | No | No | No | No | No |

### Competitive Scoring

| Competitor | Inventory | Price Compare | UX/UI | Content | Features | Mobile | Trust | TOTAL |
|-----------|-----------|--------------|-------|---------|----------|--------|-------|-------|
| **SV Booking** | 2/10 | 7/10 | 7/10 | 8/10 | 8/10 | 6/10 | 3/10 | **5.9/10** |
| **Booking.com** | 10/10 | 5/10 | 9/10 | 6/10 | 9/10 | 10/10 | 10/10 | **8.4/10** |
| **Trivago** | 9/10 | 9/10 | 7/10 | 3/10 | 6/10 | 8/10 | 8/10 | **7.1/10** |
| **Kayak** | 9/10 | 9/10 | 8/10 | 4/10 | 8/10 | 9/10 | 8/10 | **7.9/10** |
| **Hotels.com** | 10/10 | 5/10 | 8/10 | 5/10 | 8/10 | 9/10 | 9/10 | **7.7/10** |
| **TripAdvisor** | 9/10 | 8/10 | 7/10 | 10/10 | 8/10 | 9/10 | 9/10 | **8.6/10** |
| **Google Hotels** | 10/10 | 9/10 | 9/10 | 7/10 | 7/10 | 10/10 | 10/10 | **8.9/10** |

---

## Part 5: What's Missing to Be #1

### Tier 1 — Blocking Issues (Must have)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 1 | **Inventory: 134 vs millions** | No user will stay if their hotel isn't listed. This is THE #1 blocker. | High |
| 2 | **No real reviews** | Reviews are the #1 decision factor for travelers. We have a form but no data. | High |
| 3 | **All pages are CSR** | Search engines index blank pages. Zero organic traffic potential. | Medium |
| 4 | **No real price history** | PriceHistory component uses fake hash-generated data. | Low |
| 5 | **No unit/component tests** | Only 13 E2E tests. No confidence in refactoring. | Medium |

### Tier 2 — Competitive Gaps (Should have)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 6 | **No push notifications** for price alerts | Users forget about us between sessions | Medium |
| 7 | **No affiliate monetization** | Redirect URLs lack tracking params — we make zero revenue | Low |
| 8 | **No loyalty/rewards system** | No stickiness mechanism | High |
| 9 | **No native mobile apps** | PWA exists but stores demand native presence | High |
| 10 | **No i18n** | Locked out of non-English markets (70%+ of global travelers) | High |

### Tier 3 — Nice to Have (Differentiators)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| 11 | User-generated photos and Q&A | Community engagement | Medium |
| 12 | AI-powered personalized recommendations | Beyond rule-based suggestions | Medium |
| 13 | Real-time price tracking (WebSocket) | Instant updates instead of 6h refresh | High |
| 14 | Flight + hotel bundles | Cross-sell opportunity | High |
| 15 | Group booking support | Untapped market | Medium |

---

## Part 6: Our Unique Advantages

These are areas where SV Booking **already beats competitors**:

1. **AI Agent System (12 agents)** — No competitor has automated deal scanning, health monitoring, provider management, and cache pre-warming as a user-visible feature. This is genuinely novel.

2. **Travel Content Depth** — Safety info, weather, events, city guides, flight estimates, and nearby POIs all on one hotel page. Most competitors silo this content into separate apps.

3. **True Multi-Provider Transparency** — 7 independent pricing sources with visible provider trust scores, circuit breakers, and automatic failover. Trivago and Kayak compare but never show the machinery.

4. **Zero-Cost Data Stack** — Built entirely on free/open APIs (Wikivoyage, OSM, Open-Meteo, Wikidata, OpenTripMap). Operating cost is essentially just hosting.

5. **Privacy-First Design** — Favorites and trips stored locally by default, auth optional. No tracking pixels, no ad network dependencies.

---

## Part 7: Recommended Roadmap to #1

### Phase 1: Foundation (Weeks 1-4)
- [ ] Convert search, hotel, deals pages to server components (SSR for SEO)
- [ ] Scale catalog to 5,000+ hotels via automated discovery agents
- [ ] Add unit tests for all lib/ modules (target 70% coverage)
- [ ] Add rate limiting on all public API routes
- [ ] Implement affiliate tracking parameters (Booking.com, Expedia)

### Phase 2: Content & Trust (Weeks 5-8)
- [ ] Integrate TripAdvisor Content API or Google Places for real reviews
- [ ] Store real price history on every comparison call
- [ ] Add push notifications for price drops (service worker)
- [ ] Add Content-Security-Policy header
- [ ] Fix remaining 11 low/medium bugs

### Phase 3: Growth (Weeks 9-16)
- [ ] i18n framework (next-intl) with 5 languages
- [ ] Native mobile app (React Native or Capacitor)
- [ ] Loyalty points system
- [ ] AI-powered recommendation engine
- [ ] Scale catalog to 50,000+ hotels

### Phase 4: Market Leadership (Months 4-6)
- [ ] Real-time price tracking (WebSocket/SSE)
- [ ] Flight + hotel bundles
- [ ] User-generated content platform
- [ ] Regional expansion (Asia, LATAM, MENA)
- [ ] Group booking support

---

## Appendix: Files Modified in This Audit

| File | Change |
|------|--------|
| `proxy.ts` | Fixed auth bypass, added missing public paths |
| `lib/kv.js` | Fixed double-stringify bug |
| `lib/agent-utils.js` | Hardened cron auth (deny by default in prod) |
| `lib/auth.js` | Added AuthError class for proper 401 responses |
| `lib/validation.js` | Handle AuthError, stop leaking error internals |
| `lib/overpass.js` | Sanitize city/country names against injection |
| `lib/overpass-pois.js` | Sanitize hotel names against injection |
| `lib/city-coordinates.ts` | Added 26 missing city coordinates |
| `next.config.ts` | Added security headers |
| `app/search/page.tsx` | Fixed setState-in-useMemo, proper useEffect |
| `app/api/me/prefs/route.js` | Expanded VALID_CURRENCIES to all 14 |
| `components/PriceDropAlert.tsx` | Fixed wrong localStorage key |
