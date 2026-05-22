import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kv } from '@/lib/kv';
import {
  getAdminAuditEvents,
  recordAdminAuditEvent,
  sanitizeAuditDetails,
} from '@/lib/admin-audit';
import { GET as getAuditRoute } from '@/app/api/agents/audit/route';

describe('admin audit log', () => {
  beforeEach(async () => {
    await kv.del('admin:audit:index');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('redacts sensitive details recursively', () => {
    const sanitized = sanitizeAuditDetails({
      authorization: 'Bearer secret',
      credential: 'client-id:secret',
      nested: {
        apiToken: 'token-value',
        apiKey: 'abc123',
        safe: 'visible',
      },
      values: ['Bearer must-not-leak', 'token=hidden', 'visible'],
    });

    expect(sanitized).toEqual({
      authorization: '[redacted]',
      credential: '[redacted]',
      nested: {
        apiToken: '[redacted]',
        apiKey: '[redacted]',
        safe: 'visible',
      },
      values: ['[redacted]', '[redacted]', 'visible'],
    });
  });

  it('records deterministic, redacted admin events without raw client identifiers', async () => {
    const request = new Request('http://localhost:3000/api/agents/providers', {
      method: 'POST',
      headers: {
        authorization: 'Bearer admin-test-secret',
        'x-forwarded-for': '203.0.113.7',
        'user-agent': 'vitest-admin-audit',
      },
    });

    const event = await recordAdminAuditEvent({
      request,
      actor: 'admin-api-secret',
      action: 'provider.reset',
      resource: 'xotelo',
      details: {
        providerId: 'xotelo',
        secretToken: 'must-not-be-stored',
      },
    });

    expect(event?.id).toMatch(/^h_[0-9a-z]+$/);
    expect(event?.clientFingerprint).toMatch(/^h_[0-9a-z]+$/);
    expect(event?.actor).toBe('admin-api-secret');
    expect(event?.actorFingerprint).toMatch(/^h_[0-9a-z]+$/);
    expect(event?.details).toEqual({
      providerId: 'xotelo',
      secretToken: '[redacted]',
    });

    const events = await getAdminAuditEvents(10);
    expect(events).toHaveLength(1);
    const serialized = JSON.stringify(events[0]);
    expect(serialized).not.toContain('203.0.113.7');
    expect(serialized).not.toContain('admin-test-secret');
    expect(serialized).not.toContain('must-not-be-stored');
  });

  it('fingerprints non-static actors and normalizes invalid client headers', async () => {
    const request = new Request('http://localhost:3000/api/catalog/candidates', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '999.999.999.999',
        'x-real-ip': 'unknown',
        'user-agent': 'admin-audit-user-agent-with-long-value-that-should-stay-fingerprinted-only',
      },
    });

    const event = await recordAdminAuditEvent({
      request,
      actor: 'kinde|raw-user-id-123',
      action: 'catalog.candidates.approve',
      resource: 'candidate-1',
      details: {
        note: 'password=must-not-leak',
        safe: 'visible',
      },
    });

    const serialized = JSON.stringify(event);
    expect(event?.actor).toBe('admin-identity');
    expect(event?.actorFingerprint).toMatch(/^h_[0-9a-z]+$/);
    expect(event?.details.note).toBe('[redacted]');
    expect(event?.details.safe).toBe('visible');
    expect(serialized).not.toContain('kinde|raw-user-id-123');
    expect(serialized).not.toContain('999.999.999.999');
    expect(serialized).not.toContain('must-not-leak');
  });

  it('does not collapse repeated identical events in the same millisecond', async () => {
    const request = new Request('http://localhost:3000/api/agents/providers', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.8',
        'user-agent': 'vitest-admin-audit',
      },
    });

    const first = await recordAdminAuditEvent({
      request,
      actor: 'admin-api-secret',
      action: 'provider.reset',
      resource: 'xotelo',
      details: { providerId: 'xotelo' },
    });

    const second = await recordAdminAuditEvent({
      request,
      actor: 'admin-api-secret',
      action: 'provider.reset',
      resource: 'xotelo',
      details: { providerId: 'xotelo' },
    });

    expect(first?.id).not.toBe(second?.id);
    const events = await getAdminAuditEvents(10);
    expect(events.map((event) => event.id)).toEqual([second?.id, first?.id]);
  });

  it('protects the audit read endpoint and returns redacted events', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-test-secret');
    vi.stubEnv('CRON_SECRET', '');

    const writeRequest = new Request('http://localhost:3000/api/agents/providers', {
      method: 'POST',
      headers: {
        authorization: 'Bearer admin-test-secret',
        'x-forwarded-for': '203.0.113.9',
        'user-agent': 'vitest-admin-audit',
      },
    });

    await recordAdminAuditEvent({
      request: writeRequest,
      actor: 'admin-api-secret',
      action: 'provider.reset',
      resource: 'xotelo',
      details: { providerId: 'xotelo', token: 'must-not-leak' },
    });

    const denied = await getAuditRoute(new Request('http://localhost:3000/api/agents/audit'));
    expect(denied.status).toBe(401);

    const accepted = await getAuditRoute(new Request('http://localhost:3000/api/agents/audit?limit=5', {
      headers: { authorization: 'Bearer admin-test-secret' },
    }));

    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('cache-control')).toBe('no-store');
    const body = await accepted.json();
    expect(body.count).toBe(1);
    expect(body.events[0].details.token).toBe('[redacted]');
    expect(JSON.stringify(body)).not.toContain('must-not-leak');
    expect(JSON.stringify(body)).not.toContain('203.0.113.9');
  });
});
