import { afterEach, describe, expect, it, vi } from 'vitest';
import { kv } from '@/lib/kv';
import {
  AGENT_NAMES,
  getAgentHistory,
  getAgentReadiness,
  getAgentStatus,
  getAllAgentReadiness,
  getAllAgentStatuses,
  runAgent,
  verifyCronAuth,
} from '@/lib/agent-utils';

describe('agent readiness metadata', () => {
  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await kv.del(`agent:status:${AGENT_NAMES.HEALTH_MONITOR}`);
    await kv.del(`agent:history:${AGENT_NAMES.HEALTH_MONITOR}`);
    await kv.del(`agent:status:${AGENT_NAMES.DEAL_SCANNER}`);
    await kv.del(`agent:history:${AGENT_NAMES.DEAL_SCANNER}`);
  });

  it('marks key-dependent agents as blocked without exposing secret values', () => {
    vi.stubEnv('RAPIDAPI_KEY', '');

    const readiness = getAgentReadiness(AGENT_NAMES.XOTELO_DISCOVERY, { durableKv: false });

    expect(readiness.status).toBe('blocked');
    expect(readiness.missingConfig).toEqual(['RAPIDAPI_KEY']);
    expect(JSON.stringify(readiness)).not.toContain('secret-value');
  });

  it('marks cache-backed agents as non-durable when Redis is unavailable', () => {
    const readiness = getAgentReadiness(AGENT_NAMES.PRICE_CACHE, { durableKv: false });

    expect(readiness.status).toBe('ready');
    expect(readiness.durability).toBe('non-durable');
    expect(readiness.nonDurable).toBe(true);
  });

  it('reports ready durable agents and optional provider gaps without blocking execution', () => {
    vi.stubEnv('SERPAPI_KEY', 'serpapi-production-shaped-key');

    const readiness = getAgentReadiness(AGENT_NAMES.PROVIDER_MANAGER, { durableKv: true });

    expect(readiness).toMatchObject({
      status: 'ready',
      ready: true,
      durability: 'persistent',
      nonDurable: false,
      blockedReason: null,
    });
    expect(readiness.missingOptionalConfig).toEqual([
      'RAPIDAPI_KEY',
      'MAKCORPS_API_KEY',
      'AMADEUS_CLIENT_ID',
      'AMADEUS_CLIENT_SECRET',
    ]);
  });

  it('treats unknown agent names as ready with no durability requirement', () => {
    const readiness = getAgentReadiness('unknown-agent', { durableKv: true });

    expect(readiness).toEqual({
      status: 'ready',
      ready: true,
      missingConfig: [],
      missingOptionalConfig: [],
      durability: 'not-required',
      nonDurable: false,
      blockedReason: null,
    });
  });

  it('builds readiness for every registered agent and fails closed when KV configuration cannot be checked', async () => {
    vi.spyOn(kv, 'isConfigured').mockRejectedValueOnce(new Error('KV unavailable'));

    const readiness = await getAllAgentReadiness();

    expect(Object.keys(readiness)).toEqual(expect.arrayContaining(Object.values(AGENT_NAMES)));
    expect(readiness[AGENT_NAMES.PRICE_CACHE]).toMatchObject({
      status: 'ready',
      durability: 'non-durable',
      nonDurable: true,
    });
    expect(readiness[AGENT_NAMES.XOTELO_DISCOVERY].status).toBe('blocked');
  });

  it('marks durable agent readiness as persistent when KV configuration is available', async () => {
    vi.spyOn(kv, 'isConfigured').mockResolvedValueOnce(true);

    const readiness = await getAllAgentReadiness();

    expect(readiness[AGENT_NAMES.PRICE_CACHE]).toMatchObject({
      durability: 'persistent',
      nonDurable: false,
    });
  });

  it('records successful agent status and bounded run history', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'));

    const status = await runAgent(AGENT_NAMES.HEALTH_MONITOR, async () => ({ checked: true }));
    const stored = await getAgentStatus(AGENT_NAMES.HEALTH_MONITOR);
    const allStatuses = await getAllAgentStatuses();
    const history = await getAgentHistory(AGENT_NAMES.HEALTH_MONITOR);

    expect(status).toMatchObject({
      status: 'completed',
      startedAt: '2026-05-31T12:00:00.000Z',
      completedAt: '2026-05-31T12:00:00.000Z',
      elapsedMs: 0,
      result: { checked: true },
    });
    expect(stored).toMatchObject({ status: 'completed', result: { checked: true } });
    expect(allStatuses[AGENT_NAMES.HEALTH_MONITOR]).toMatchObject({ status: 'completed' });
    expect(allStatuses[AGENT_NAMES.PROVIDER_MANAGER]).toEqual({ status: 'never-run' });
    expect(history).toEqual([
      expect.objectContaining({ status: 'completed', elapsedMs: 0 }),
    ]);
  });

  it('truncates agent run history to the ten most recent entries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T13:00:00.000Z'));

    for (let index = 0; index < 11; index += 1) {
      await runAgent(AGENT_NAMES.HEALTH_MONITOR, async () => ({ index }));
    }

    const history = await getAgentHistory(AGENT_NAMES.HEALTH_MONITOR);

    expect(history).toHaveLength(10);
    expect(history[0]).toMatchObject({ status: 'completed' });
    expect(await getAgentHistory('never-run-agent')).toEqual([]);
  });

  it('stores sanitized agent errors without swallowing the original failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T12:30:00.000Z'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runAgent(AGENT_NAMES.DEAL_SCANNER, async () => {
      throw new Error('provider token leaked upstream');
    })).rejects.toThrow('provider token leaked upstream');

    const stored = await getAgentStatus(AGENT_NAMES.DEAL_SCANNER);
    const history = await getAgentHistory(AGENT_NAMES.DEAL_SCANNER);

    expect(stored).toMatchObject({
      status: 'error',
      startedAt: '2026-05-31T12:30:00.000Z',
      completedAt: '2026-05-31T12:30:00.000Z',
      elapsedMs: 0,
      error: 'Agent execution failed',
    });
    expect(history).toEqual([
      expect.objectContaining({ status: 'error', error: 'Agent execution failed' }),
    ]);
    expect(JSON.stringify(stored)).not.toContain('provider token leaked upstream');
    expect(consoleSpy).toHaveBeenCalledWith(
      `Agent ${AGENT_NAMES.DEAL_SCANNER} execution failed:`,
      expect.any(Error)
    );
  });

  it('verifies cron auth with localhost dev fallback and timing-safe bearer checks', async () => {
    vi.stubEnv('CRON_SECRET', '');

    expect(verifyCronAuth(new Request('http://localhost:3000/api/cron', {
      headers: { host: 'localhost:3000' },
    }))).toEqual({ authorized: true });

    const missingSecret = verifyCronAuth(new Request('https://svbooking.com/api/cron', {
      headers: { host: 'svbooking.com' },
    }));
    expect(missingSecret.authorized).toBe(false);
    expect(missingSecret.response?.status).toBe(403);
    await expect(missingSecret.response!.json()).resolves.toEqual({
      error: 'CRON_SECRET not configured',
    });

    vi.stubEnv('CRON_SECRET', 'cron-secret-value');
    expect(verifyCronAuth(new Request('https://svbooking.com/api/cron', {
      headers: { authorization: 'Bearer cron-secret-value' },
    }))).toEqual({ authorized: true });

    const invalid = verifyCronAuth(new Request('https://svbooking.com/api/cron', {
      headers: { authorization: 'Basic cron-secret-value' },
    }));
    expect(invalid.authorized).toBe(false);
    expect(invalid.response?.status).toBe(401);
    expect(invalid.response?.headers.get('Cache-Control')).toBe('no-store');
  });
});
