import { describe, expect, it } from 'vitest';
import {
  RETENTION_SECONDS,
  getDataRetentionPolicies,
  getDataRetentionReadiness,
} from '@/lib/data-retention';
import { getUserDataPrivacyReadiness } from '@/lib/user-data';
import { GET as getDataRetention } from '@/app/api/data-retention/route';

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

  it('exposes a public no-store retention policy endpoint', async () => {
    const response = await getDataRetention();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.service).toBe('sv-booking');
    expect(body.policies.length).toBeGreaterThan(0);
    expect(body.readiness.rawSecretStorage).toBe('not-allowed');
  });
});
