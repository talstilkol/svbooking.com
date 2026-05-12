// Master Orchestrator — Runs all background agents in dependency order.
// Called by Vercel cron (every 6 hours) or manually from the dashboard.
//
// Execution order:
//   1. Health Monitor  (fast, 5-10s)  — check what's working
//   2. Enrichment      (medium, 30s)  — enrich metadata
//   3. Discovery       (medium, 30s)  — find new hotels
//   4. Price Cache     (slow, 2-5m)   — warm price cache
//   5. Deal Scanner    (slow, 2-5m)   — find best deals
//
// Each agent runs independently. If one fails, the rest continue.

import { runAgent, verifyCronAuth, AGENT_NAMES } from '@/lib/agent-utils';
import { kv } from '@/lib/kv';
import { addDiscoveredHotel } from '@/lib/hotels-catalog';

const AGENT_URLS = [
  { name: AGENT_NAMES.HEALTH_MONITOR, path: '/api/agents/auto/health-monitor' },
  { name: AGENT_NAMES.ENRICHMENT,     path: '/api/agents/auto/enrichment' },
  { name: AGENT_NAMES.DISCOVERY,      path: '/api/agents/auto/discovery' },
  { name: AGENT_NAMES.PRICE_CACHE,    path: '/api/agents/auto/price-cache' },
  { name: AGENT_NAMES.DEAL_SCANNER,   path: '/api/agents/auto/deal-scanner' },
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
      results.push({
        agent: agent.name,
        status: 'error',
        elapsedMs: Date.now() - startedAt,
        error: err.message,
      });
    }
  }

  // Auto-merge discovered hotels into runtime catalog
  let autoMerged = 0;
  try {
    const discoveredKeys = await kv.keys('discovered:hotels:*');
    if (discoveredKeys.length > 0) {
      const values = await kv.mget(discoveredKeys);
      for (const hotels of values) {
        if (!Array.isArray(hotels)) continue;
        for (const hotel of hotels) {
          if (addDiscoveredHotel(hotel)) autoMerged++;
        }
      }
    }
  } catch { /* non-critical */ }

  const completed = results.filter((r) => r.status === 'completed').length;
  const failed = results.filter((r) => r.status === 'error').length;

  return {
    agentsRun: results.length,
    completed,
    failed,
    autoMergedHotels: autoMerged,
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
    return Response.json(status);
  } catch (err) {
    return Response.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
