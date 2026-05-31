import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

import { verifyAdminSession } from '@/lib/admin-session';

describe('admin session verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing Kinde users with no-store unauthorized responses', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);

    const auth = await verifyAdminSession({
      env: { ADMIN_USER_IDS: 'user-1', ADMIN_EMAILS: 'owner@example.com' } as unknown as NodeJS.ProcessEnv,
    });
    const body = await auth.response!.json();

    expect(auth.authorized).toBe(false);
    expect(auth.response!.status).toBe(401);
    expect(auth.response!.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Unauthorized');
  });
});
