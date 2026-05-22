import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string },
  fetch: vi.fn(),
  recordAdminAuditEvent: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(async () => mocks.user),
}));

vi.mock('@/lib/admin-audit', () => ({
  recordAdminAuditEvent: mocks.recordAdminAuditEvent,
}));

import { GET, POST } from '@/app/api/admin/[...target]/route';

function request(path: string, init: RequestInit = {}) {
  return new Request(`http://localhost:3000${path}`, init);
}

describe('/api/admin bridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mocks.user = { id: 'admin-1', email: 'admin@example.com' };
    mocks.fetch.mockReset();
    mocks.recordAdminAuditEvent.mockReset();
    vi.stubEnv('ADMIN_API_SECRET', 'admin-bridge-secret-value');
    vi.stubEnv('CRON_SECRET', 'cron-bridge-secret-value');
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.com');
    vi.stubEnv('ADMIN_USER_IDS', '');
    vi.stubGlobal('fetch', mocks.fetch);
  });

  it('denies admin bridge access when the Kinde user is not allowlisted', async () => {
    mocks.user = { id: 'user-2', email: 'reader@example.com' };

    const response = await GET(request('/api/admin/agents/providers'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/admin dashboard access/i);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('forwards allowlisted admin reads with the server-side admin bearer secret', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ providers: [] }));

    const response = await GET(request('/api/admin/agents/providers?limit=10'));
    const body = await response.json();
    const [target, init] = mocks.fetch.mock.calls[0];

    expect(response.status).toBe(200);
    expect(body.providers).toEqual([]);
    expect(String(target)).toBe('http://localhost:3000/api/agents/providers?limit=10');
    expect(init.headers.get('Authorization')).toBe('Bearer admin-bridge-secret-value');
  });

  it('audits allowlisted admin mutations without exposing browser-side bearer secrets', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ ok: true }));

    const response = await POST(request('/api/admin/agents/providers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({ action: 'reset', providerId: 'xotelo' }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.recordAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actor: 'kinde:admin-1',
      action: 'admin.bridge.forward',
      resource: '/api/agents/providers',
      status: 'success',
    }));
  });
});
