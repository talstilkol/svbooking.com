import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyAdminAuth, verifyAdminOnly } from '@/lib/admin-auth';

function request(token?: string) {
  return new Request('http://localhost:3000/api/agents/providers', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('verifyAdminAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('marks missing admin secret responses as no-store', async () => {
    vi.stubEnv('ADMIN_API_SECRET', '');
    vi.stubEnv('CRON_SECRET', '');

    const auth = verifyAdminAuth(request());
    const body = await auth.response!.json();

    expect(auth.authorized).toBe(false);
    expect(auth.response!.status).toBe(403);
    expect(auth.response!.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Admin API secret is not configured');
  });

  it('marks invalid admin tokens as no-store', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret');
    vi.stubEnv('CRON_SECRET', '');

    const auth = verifyAdminAuth(request('wrong-secret'));
    const body = await auth.response!.json();

    expect(auth.authorized).toBe(false);
    expect(auth.response!.status).toBe(401);
    expect(auth.response!.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Unauthorized');
  });

  it('accepts valid admin bearer tokens through timing-safe comparison', () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret');
    vi.stubEnv('CRON_SECRET', '');

    const auth = verifyAdminAuth(request('admin-secret'));

    expect(auth).toEqual({ authorized: true, subject: 'admin-api-secret' });
  });

  it('rejects malformed and different-length bearer tokens without authenticating', async () => {
    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret');
    vi.stubEnv('CRON_SECRET', 'cron-secret');

    const shortToken = verifyAdminAuth(request('admin'));
    const missingBearer = verifyAdminAuth(new Request('http://localhost:3000/api/agents/providers', {
      headers: { Authorization: 'admin-secret' },
    }));

    expect(shortToken.authorized).toBe(false);
    expect(shortToken.response!.status).toBe(401);
    expect(shortToken.response!.headers.get('cache-control')).toBe('no-store');
    expect(missingBearer.authorized).toBe(false);
    expect(missingBearer.response!.status).toBe(401);
  });

  it('accepts cron fallback bearer tokens through the same verifier', () => {
    vi.stubEnv('ADMIN_API_SECRET', '');
    vi.stubEnv('CRON_SECRET', 'cron-secret');

    const auth = verifyAdminAuth(request('cron-secret'));

    expect(auth).toEqual({ authorized: true, subject: 'cron-secret' });
  });

  it('keeps strict admin-only auth separate from cron fallback tokens', async () => {
    vi.stubEnv('ADMIN_API_SECRET', '');
    vi.stubEnv('CRON_SECRET', 'cron-secret');

    const missingAdmin = verifyAdminOnly(request('cron-secret'));
    expect(missingAdmin.authorized).toBe(false);
    expect(missingAdmin.response!.status).toBe(403);
    expect((await missingAdmin.response!.json()).error).toBe('Admin API secret is not configured');

    vi.stubEnv('ADMIN_API_SECRET', 'admin-secret');
    const accepted = verifyAdminOnly(request('admin-secret'));
    const cronRejected = verifyAdminOnly(request('cron-secret'));

    expect(accepted).toEqual({ authorized: true, subject: 'admin-api-secret' });
    expect(cronRejected.authorized).toBe(false);
    expect(cronRejected.response!.status).toBe(401);
  });
});
