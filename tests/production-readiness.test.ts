import { describe, expect, it } from 'vitest';
import {
  buildProductionReadinessSummary,
  getConfiguredPartnerProviderIds,
  getEnvConfigurationIssue,
  isKindeConfigured,
} from '@/lib/production-readiness.mjs';

const requiredEnv = {
  ADMIN_API_SECRET: 'svbooking-admin-secret-0001',
  CRON_SECRET: 'svbooking-cron-secret-0001',
  UPSTASH_REDIS_REST_URL: 'https://redis.svbooking.com',
  UPSTASH_REDIS_REST_TOKEN: 'svbooking-redis-token-0001',
  KINDE_CLIENT_ID: 'svbooking-kinde-client-id-0001',
  KINDE_CLIENT_SECRET: 'svbooking-kinde-client-secret-0001',
  KINDE_ISSUER_URL: 'https://auth.svbooking.com',
  KINDE_SITE_URL: 'https://svbooking.com',
  KINDE_POST_LOGOUT_REDIRECT_URL: 'https://svbooking.com',
  KINDE_POST_LOGIN_REDIRECT_URL: 'https://svbooking.com/dashboard',
};

describe('production readiness shared contract', () => {
  it('keeps Kinde env as an all-or-nothing production requirement', () => {
    expect(isKindeConfigured(requiredEnv)).toBe(true);
    expect(isKindeConfigured({ ...requiredEnv, KINDE_CLIENT_SECRET: '' })).toBe(false);
  });

  it('requires complete partner provider groups', () => {
    expect(getConfiguredPartnerProviderIds({ ...requiredEnv, SERPAPI_KEY: 'svbooking-serpapi-key-0001' })).toEqual(['serpapi']);
    expect(getConfiguredPartnerProviderIds({
      ...requiredEnv,
      AMADEUS_CLIENT_ID: 'svbooking-amadeus-client-id-0001',
      AMADEUS_CLIENT_SECRET: '',
    })).toEqual([]);
    expect(getConfiguredPartnerProviderIds({
      ...requiredEnv,
      AMADEUS_CLIENT_ID: 'svbooking-amadeus-client-id-0001',
      AMADEUS_CLIENT_SECRET: 'svbooking-amadeus-secret-0001',
    })).toEqual(['amadeus']);
  });

  it('rejects placeholder, short, and non-HTTPS production env values', () => {
    expect(getEnvConfigurationIssue({ ADMIN_API_SECRET: 'change-me' }, 'ADMIN_API_SECRET')).toBe('placeholder value is not allowed');
    expect(getEnvConfigurationIssue({ CRON_SECRET: 'short' }, 'CRON_SECRET')).toBe('must be at least 16 characters');
    expect(getEnvConfigurationIssue({ KINDE_ISSUER_URL: 'http://auth.svbooking.com' }, 'KINDE_ISSUER_URL')).toBe('must be an HTTPS URL without credentials');
    expect(getEnvConfigurationIssue({ UPSTASH_REDIS_REST_URL: 'https://user:pass@redis.svbooking.com' }, 'UPSTASH_REDIS_REST_URL')).toBe('must be an HTTPS URL without credentials');
  });

  it('builds a non-secret strict readiness summary', () => {
    const summary = buildProductionReadinessSummary({
      env: { ...requiredEnv, SERPAPI_KEY: 'svbooking-serpapi-key-0001' },
      strict: true,
    });

    expect(summary.strict).toBe(true);
    expect(summary.productionReady).toBe(true);
    expect(summary.blockers).toEqual([]);
    expect(summary.pricingProviders.find((provider) => provider.name === 'SerpAPI')?.configured).toBe(true);
    expect(JSON.stringify(summary)).not.toContain('svbooking-admin-secret-0001');
    expect(JSON.stringify(summary)).not.toContain('svbooking-kinde-client-secret-0001');
    expect(JSON.stringify(summary)).not.toContain('svbooking-serpapi-key-0001');
  });
});
