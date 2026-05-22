// Master Orchestrator — Runs all background agents in dependency order.
// Called by Vercel cron (every 6 hours) or manually from the dashboard.
//
// Execution order:
//   1. Provider Manager  (fast, 5-10s)  — check providers, reset circuit breakers
//   2. Health Monitor    (fast, 5-10s)  — check data sources
//   3. Enrichment        (medium, 30s)  — enrich metadata
//   4. Discovery         (medium, 30s)  — find new hotels (city-by-city)
//   5. Bulk Discovery    (medium, 60s)  — massive Wikidata catalog expansion
//   6. OSM Scanner       (medium, 60s)  — find hotels with TA refs from OpenStreetMap
//   7. Price Cache       (slow, 2-5m)   — warm price cache
//   8. Deal Scanner      (slow, 2-5m)   — find deal candidates
//
// Each agent runs independently. If one fails, the rest continue.
// Discovery agents write to the candidate review queue; catalog promotion remains admin-approved.

import { runAgent, verifyCronAuth, AGENT_NAMES } from '@/lib/agent-utils';

const AGENT_URLS = [
  { name: AGENT_NAMES.PROVIDER_MANAGER, path: '/api/agents/auto/provider-manager' },
  { name: AGENT_NAMES.HEALTH_MONITOR,   path: '/api/agents/auto/health-monitor' },
  { name: AGENT_NAMES.ENRICHMENT,       path: '/api/agents/auto/enrichment' },
  { name: AGENT_NAMES.DISCOVERY,        path: '/api/agents/auto/discovery' },
  { name: AGENT_NAMES.BULK_DISCOVERY,   path: '/api/agents/auto/bulk-discovery' },
  { name: AGENT_NAMES.OSM_SCANNER,      path: '/api/agents/auto/osm-scanner' },
  { name: AGENT_NAMES.XOTELO_DISCOVERY, path: '/api/agents/auto/xotelo-discovery' },
  { name: AGENT_NAMES.PRICE_CACHE,      path: '/api/agents/auto/price-cache' },
  { name: AGENT_NAMES.DEAL_SCANNER,     path: '/api/agents/auto/deal-scanner' },
  { name: AGENT_NAMES.POI_CACHE,        path: '/api/agents/auto/poi-cache' },
  { name: AGENT_NAMES.TRAVEL_GUIDE,     path: '/api/agents/auto/travel-guide-cache' },
  { name: AGENT_NAMES.EVENTS_CACHE,     path: '/api/agents/auto/events-cache' },
];

async function runOrchestrator(baseUrl, authHeader) {
  const results = [];

  for (const agent of AGENT_URLS) {
    const startedAt = Date.now();
    try {
      const url = `${baseUrl}${agent.path}`;
      const headers = {};
      if (authHeader) headers['Authorization'] = authHeader;

      const res = await fetch(url, { headers });
      const data = await res.json();
      const elapsed = Date.now() - startedAt;

      results.push({
        agent: agent.name,
        status: res.ok ? 'completed' : 'error',
        elapsedMs: elapsed,
        result: data?.result || data?.error || null,
      });
    } catch (err) {
      console.error(`Agent ${agent.name} orchestration error:`, err);
      results.push({
        agent: agent.name,
        status: 'error',
        elapsedMs: Date.now() - startedAt,
        error: 'Agent unavailable',
      });
    }
  }

  const completed = results.filter((r) => r.status === 'completed').length;
  const failed = results.filter((r) => r.status === 'error').length;

  return {
    agentsRun: results.length,
    completed,
    failed,
    catalogPromotion: 'admin-review-required',
    agents: results,
  };
}

export async function GET(request) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.response;

  const baseUrl = new URL(request.url).origin;
  const authHeader = request.headers.get('authorization');

  try {
    const status = await runAgent(AGENT_NAMES.ORCHESTRATOR, () =>
      runOrchestrator(baseUrl, authHeader)
    );
    return Response.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('GET /api/agents/auto/orchestrate error:', err);
    return Response.json(
      { status: 'error', error: 'Agent orchestration unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
