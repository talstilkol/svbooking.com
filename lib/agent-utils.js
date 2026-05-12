// Shared utilities for automated background agents.
// Provides: run tracking, concurrency control, cron auth, and status reporting.

import { kv } from './kv';

const STATUS_TTL = 86400; // 24 hours
const RUNNING_TTL = 3600; // 1 hour (safety: auto-expire stuck "running" statuses)

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
};

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
    const completedAt = new Date().toISOString();
    const elapsed = Date.now() - new Date(startedAt).getTime();

    const status = {
      status: 'error',
      startedAt,
      completedAt,
      elapsedMs: elapsed,
      error: err?.message || String(err),
    };

    await kv.setWithTTL(statusKey, status, STATUS_TTL);
    await appendRunHistory(name, { status: 'error', startedAt, completedAt, elapsedMs: elapsed, error: status.error });

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
    await kv.setWithTTL(historyKey, history, STATUS_TTL * 7); // 7 days
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
 * @param {number} [delayMs=0] - Delay between batches (ms)
 * @returns {Promise<Array<{status: 'fulfilled'|'rejected', value?: any, reason?: any}>>}
 */
export async function withConcurrency(items, concurrency, fn, delayMs = 0) {
  const results = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);

    // Delay between batches (rate limiting)
    if (delayMs > 0 && i + concurrency < items.length) {
      await sleep(delayMs);
    }
  }

  return results;
}

/**
 * Sleep for a specified duration.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  // Dev mode: no secret configured, allow all
  if (!cronSecret) {
    return { authorized: true };
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: Response.json(
      { error: 'Unauthorized — requires CRON_SECRET' },
      { status: 401 }
    ),
  };
}
