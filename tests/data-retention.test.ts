import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RETENTION_SECONDS,
  getDataRetentionPolicies,
  getDataRetentionReadiness,
} from '@/lib/data-retention';
import { getUserDataPrivacyReadiness } from '@/lib/user-data';
import { GET as getDataRetention } from '@/app/api/data-retention/route';

const TEST_ADMIN_SECRET = 'test-admin-secret';

describe('data retention policy', () => {
  it('defines retention windows for operational data classes', () => {
    expect(RETENTION_SECONDS.adminAuditEvents).toBe(90 * 86400);
    expect(RETENTION_SECONDS.priceAlertEvents).toBe(30 * 86400);
    expect(RETENTION_SECONDS.opsAlertEvents).toBe(30 * 86400);
    expect(RETENTION_SECONDS.providerUptimeEvents).toBe(14 * 86400);
    expect(RETENTION_SECONDS.providerTrends).toBe(2 * 86400);

    const policies = getDataRetentionPolicies();
    expect(policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'admin-audit-events', containsRawUserId: false }),
        expect.objectContaining({ id: 'price-accuracy-events', containsRawUserId: false }),
        expect.objectContaining({ id: 'ops-alert-events', containsRawUserId: false }),
        expect.objectContaining({ id: 'provider-uptime-events', containsRawUserId: false }),
        expect.objectContaining({
          id: 'user-owned-alerts-favorites-trips',
          containsRawUserId: true,
          deletion: 'user-action-via-/api/me/data-or-auth-provider-retention',
        }),
      ])
    );
  });

  it('reports retention readiness without secret values', () => {
    const readiness = getDataRetentionReadiness();
    const privacy = getUserDataPrivacyReadiness();

    expect(readiness.status).toBe('defined');
    expect(readiness.policyCount).toBeGreaterThanOrEqual(9);
    expect(readiness.rawSecretStorage).toBe('not-allowed');
    expect(readiness.rawUserIdInOperationalEvents).toBe(false);
    expect(privacy.deletionAvailable).toBe(true);
    expect(privacy.rawUserIdInExportEnvelope).toBe(false);
    expect(JSON.stringify(readiness)).not.toContain('secret');
  });

  it('exposes an authenticated no-store retention policy endpoint', async () => {
    vi.stubEnv('ADMIN_API_SECRET', TEST_ADMIN_SECRET);
    vi.stubEnv('CRON_SECRET', '');

    const request = new Request('http://localhost/api/data-retention', {
      headers: { Authorization: `Bearer ${TEST_ADMIN_SECRET}` },
    });
    const response = await getDataRetention(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.service).toBe('sv-booking');
    expect(body.policies.length).toBeGreaterThan(0);
    expect(body.readiness.rawSecretStorage).toBe('not-allowed');

    vi.unstubAllEnvs();
  });

  it('rejects unauthenticated requests to retention endpoint', async () => {
    vi.stubEnv('ADMIN_API_SECRET', TEST_ADMIN_SECRET);
    vi.stubEnv('CRON_SECRET', '');

    const request = new Request('http://localhost/api/data-retention');
    const response = await getDataRetention(request);

    expect(response.status).toBe(401);

    vi.unstubAllEnvs();
  });
});
