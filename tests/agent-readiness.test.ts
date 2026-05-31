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
});
