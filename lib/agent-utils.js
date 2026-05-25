// Shared utilities for automated background agents.
// Provides: run tracking, concurrency control, cron auth, and status reporting.

import { timingSafeEqual } from 'node:crypto';
import { kv } from './kv';
import { RETENTION_SECONDS } from './data-retention';

const STATUS_TTL = RETENTION_SECONDS.agentStatus;
const RUNNING_TTL = RETENTION_SECONDS.agentRunningLock;

/** Agent names — used as keys and for status lookup */
export const AGENT_NAMES = {
  DISCOVERY: 'discovery',
  BULK_DISCOVERY: 'bulk-discovery',
  OSM_SCANNER: 'osm-scanner',
  XOTELO_DISCOVERY: 'xotelo-discovery',
  PRICE_CACHE: 'price-cache',
  DEAL_SCANNER: 'deal-scanner',
  ENRICHMENT: 'enrichment',
  HEALTH_MONITOR: 'health-monitor',
  PROVIDER_MANAGER: 'provider-manager',
  ORCHESTRATOR: 'orchestrator',
  POI_CACHE: 'poi-cache',
  TRAVEL_GUIDE: 'travel-guide-cache',
  EVENTS_CACHE: 'events-cache',
};

export const AGENT_REQUIREMENTS = {
  [AGENT_NAMES.PROVIDER_MANAGER]: {
    requiredEnv: [],
    optionalEnv: ['RAPIDAPI_KEY', 'SERPAPI_KEY', 'MAKCORPS_API_KEY', 'AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.HEALTH_MONITOR]: {
    requiredEnv: [],
    optionalEnv: ['RAPIDAPI_KEY', 'SERPAPI_KEY', 'MAKCORPS_API_KEY', 'AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'],
    requiresDurableKv: false,
  },
  [AGENT_NAMES.ENRICHMENT]: {
    requiredEnv: [],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.DISCOVERY]: {
    requiredEnv: [],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.BULK_DISCOVERY]: {
    requiredEnv: [],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.OSM_SCANNER]: {
    requiredEnv: [],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.XOTELO_DISCOVERY]: {
    requiredEnv: ['RAPIDAPI_KEY'],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.PRICE_CACHE]: {
    requiredEnv: [],
    optionalEnv: ['RAPIDAPI_KEY', 'SERPAPI_KEY', 'MAKCORPS_API_KEY', 'AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.DEAL_SCANNER]: {
    requiredEnv: [],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.POI_CACHE]: {
    requiredEnv: [],
    optionalEnv: ['OPENTRIPMAP_API_KEY'],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.TRAVEL_GUIDE]: {
    requiredEnv: [],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.EVENTS_CACHE]: {
    requiredEnv: ['TICKETMASTER_API_KEY'],
    optionalEnv: [],
    requiresDurableKv: true,
  },
  [AGENT_NAMES.ORCHESTRATOR]: {
    requiredEnv: ['CRON_SECRET'],
    optionalEnv: ['ADMIN_API_SECRET'],
    requiresDurableKv: true,
  },
};

function missingEnv(envNames, env = process.env) {
  return envNames.filter((name) => !env[name]);
}

export function getAgentReadiness(name, { env = process.env, durableKv = false } = {}) {
  const requirements = AGENT_REQUIREMENTS[name] || { requiredEnv: [], optionalEnv: [], requiresDurableKv: false };
  const missingRequired = missingEnv(requirements.requiredEnv, env);
  const missingOptional = missingEnv(requirements.optionalEnv, env);
  const nonDurable = Boolean(requirements.requiresDurableKv && !durableKv);
  const blockedReasons = [];

  if (missingRequired.length > 0) {
    blockedReasons.push(`Missing required configuration: ${missingRequired.join(', ')}`);
  }

  return {
    status: missingRequired.length > 0 ? 'blocked' : 'ready',
    ready: missingRequired.length === 0,
    missingConfig: missingRequired,
    missingOptionalConfig: missingOptional,
    durability: requirements.requiresDurableKv
      ? (durableKv ? 'persistent' : 'non-durable')
      : 'not-required',
    nonDurable,
    blockedReason: blockedReasons.join('; ') || null,
  };
}

export async function getAllAgentReadiness() {
  let durableKv = false;
  try {
    durableKv = await kv.isConfigured();
  } catch {
    durableKv = false;
  }

  return Object.fromEntries(
    Object.values(AGENT_NAMES).map((name) => [name, getAgentReadiness(name, { durableKv })])
  );
}

/**
 * Run an agent with automatic status tracking in KV.
 * Status is stored at `agent:status:{name}` with 24h TTL.
 *
 * @param {string} name - Agent name (from AGENT_NAMES)
 * @param {() => Promise<any>} fn - Agent logic function
 * @returns {Promise<{status: string, startedAt: string, completedAt?: string, result?: any, error?: string}>}
 */
export async function runAgent(name, fn) {
  const startedAt = new Date().toISOString();
  const statusKey = `agent:status:${name}`;

  // Mark as running
  await kv.setWithTTL(statusKey, { status: 'running', startedAt }, RUNNING_TTL);

  try {
    const result = await fn();
    const completedAt = new Date().toISOString();
    const elapsed = Date.now() - new Date(startedAt).getTime();

    const status = {
      status: 'completed',
      startedAt,
      completedAt,
      elapsedMs: elapsed,
      result,
    };

    await kv.setWithTTL(statusKey, status, STATUS_TTL);

    // Also keep a run history (last 10 runs)
    await appendRunHistory(name, { status: 'completed', startedAt, completedAt, elapsedMs: elapsed });

    return status;
  } catch (err) {
    console.error(`Agent ${name} execution failed:`, err);
    const completedAt = new Date().toISOString();
    const elapsed = Date.now() - new Date(startedAt).getTime();
    const sanitizedError = 'Agent execution failed';

    const status = {
      status: 'error',
      startedAt,
      completedAt,
      elapsedMs: elapsed,
      error: sanitizedError,
    };

    await kv.setWithTTL(statusKey, status, STATUS_TTL);
    await appendRunHistory(name, { status: 'error', startedAt, completedAt, elapsedMs: elapsed, error: sanitizedError });

    throw err;
  }
}

/**
 * Get current status of an agent.
 */
export async function getAgentStatus(name) {
  return await kv.get(`agent:status:${name}`);
}

/**
 * Get status of all agents.
 */
export async function getAllAgentStatuses() {
  const names = Object.values(AGENT_NAMES);
  const statuses = await kv.mget(names.map((n) => `agent:status:${n}`));
  const result = {};
  names.forEach((name, i) => {
    result[name] = statuses[i] || { status: 'never-run' };
  });
  return result;
}

/**
 * Append a run to the agent's history (keeps last 10).
 */
async function appendRunHistory(name, entry) {
  try {
    const historyKey = `agent:history:${name}`;
    const history = (await kv.get(historyKey)) || [];
    history.unshift(entry);
    if (history.length > 10) history.length = 10;
    await kv.setWithTTL(historyKey, history, RETENTION_SECONDS.agentRunHistory);
  } catch {
    // Non-critical — don't block agent execution
  }
}

/**
 * Get run history for an agent.
 */
export async function getAgentHistory(name) {
  return (await kv.get(`agent:history:${name}`)) || [];
}

/**
 * Process items in batches with concurrency control.
 *
 * @param {Array} items - Items to process
 * @param {number} concurrency - Max parallel executions
 * @param {(item: any) => Promise<any>} fn - Processing function
 * @param {number|((result: {status: string, value?: any}) => number)} [delayMs=0]
 *        Fixed delay (ms) between items, or a function that receives the result
 *        and returns the delay. Use a function to skip delays on cache hits:
 *          `(r) => r?.value?.cached ? 0 : 100`
 * @returns {Promise<Array<{status: 'fulfilled'|'rejected', value?: any, reason?: any}>>}
 */
export async function withConcurrency(items, concurrency, fn, delayMs = 0) {
  const getDelay = typeof delayMs === 'function' ? delayMs : () => delayMs;
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      try {
        results[idx] = { status: 'fulfilled', value: await fn(items[idx]) };
      } catch (err) {
        results[idx] = { status: 'rejected', reason: err };
      }
      if (nextIndex < items.length) {
        const d = getDelay(results[idx]);
        if (d > 0) await sleep(d);
      }
    }
  }

  // Launch N workers that pull items from a shared index
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/**
 * Sleep for a specified duration.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timingSafeSecretEqual(candidate, expected) {
  const candidateBuffer = Buffer.from(String(candidate || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
  const length = Math.max(candidateBuffer.length, expectedBuffer.length, 1);
  const paddedCandidate = Buffer.alloc(length);
  const paddedExpected = Buffer.alloc(length);

  candidateBuffer.copy(paddedCandidate);
  expectedBuffer.copy(paddedExpected);

  return timingSafeEqual(paddedCandidate, paddedExpected) && candidateBuffer.length === expectedBuffer.length;
}

function bearerTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const prefix = 'Bearer ';
  if (!authHeader.startsWith(prefix)) return '';
  return authHeader.slice(prefix.length);
}

/**
 * Verify cron authorization.
 * Vercel sends CRON_SECRET as Bearer token automatically.
 * In dev mode (no CRON_SECRET set), allow all requests.
 *
 * @param {Request} request
 * @returns {{ authorized: boolean, response?: Response }}
 */
export function verifyCronAuth(request) {
  const cronSecret = process.env.CRON_SECRET;

  // Dev mode: allow all only on localhost
  if (!cronSecret) {
    const host = request.headers.get('host') || '';
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      return { authorized: true };
    }
    // In production without CRON_SECRET, deny by default
    return {
      authorized: false,
      response: Response.json(
        { error: 'CRON_SECRET not configured' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const token = bearerTokenFromRequest(request);
  if (timingSafeSecretEqual(token, cronSecret)) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: Response.json(
      { error: 'Unauthorized — requires CRON_SECRET' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    ),
  };
}
