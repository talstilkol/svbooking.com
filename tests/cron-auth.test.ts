import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyCronAuth } from '@/lib/agent-utils';

function request(headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/agents/auto/orchestrate', { headers });
}

describe('verifyCronAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('denies localhost cron calls when no cron secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const auth = verifyCronAuth(request({ host: 'localhost:3000' }));
    const body = await auth.response!.json();

    expect(auth.authorized).toBe(false);
    expect(auth.response!.status).toBe(403);
    expect(auth.response!.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('CRON_SECRET not configured');
  });

  it('denies non-local cron calls when cron secret is missing', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const auth = verifyCronAuth(request({ host: 'svbooking.example' }));
    const body = await auth.response!.json();

    expect(auth.authorized).toBe(false);
    expect(auth.response!.status).toBe(403);
    expect(auth.response!.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('CRON_SECRET not configured');
  });

  it('accepts valid cron bearer tokens through timing-safe comparison', () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret');

    const auth = verifyCronAuth(request({ Authorization: 'Bearer cron-secret' }));

    expect(auth).toEqual({ authorized: true });
  });

  it('rejects malformed and different-length cron bearer tokens without authenticating', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret');

    const shortToken = verifyCronAuth(request({ Authorization: 'Bearer cron' }));
    const missingBearer = verifyCronAuth(request({ Authorization: 'cron-secret' }));
    const missingAuthorization = verifyCronAuth(request());

    expect(shortToken.authorized).toBe(false);
    expect(shortToken.response!.status).toBe(401);
    expect(shortToken.response!.headers.get('cache-control')).toBe('no-store');
    expect(missingBearer.authorized).toBe(false);
    expect(missingBearer.response!.status).toBe(401);
    expect(missingAuthorization.authorized).toBe(false);
    expect(missingAuthorization.response!.status).toBe(401);
  });

  it('denies missing-secret cron calls when the host header is absent', () => {
    vi.stubEnv('CRON_SECRET', '');

    const auth = verifyCronAuth(new Request('https://svbooking.example/api/agents/auto/orchestrate'));

    expect(auth.authorized).toBe(false);
    expect(auth.response!.status).toBe(403);
  });
});
