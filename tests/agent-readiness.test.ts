import { afterEach, describe, expect, it, vi } from 'vitest';
import { AGENT_NAMES, getAgentReadiness } from '@/lib/agent-utils';

describe('agent readiness metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
});
