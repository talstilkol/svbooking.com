import { afterEach, describe, expect, it, vi } from 'vitest';

const kinde = vi.hoisted(() => ({
  getUser: vi.fn(),
  isAuthenticated: vi.fn(),
}));

vi.mock('@kinde-oss/kinde-auth-nextjs/server', () => ({
  getKindeServerSession: () => kinde,
}));

describe('auth session helpers', () => {
  afterEach(() => {
    kinde.getUser.mockReset();
    kinde.isAuthenticated.mockReset();
  });

  it('returns null when the Kinde session is not authenticated', async () => {
    kinde.isAuthenticated.mockResolvedValue(false);
    const { getCurrentUser } = await import('@/lib/auth');

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(kinde.getUser).not.toHaveBeenCalled();
  });

  it('returns the current user and requires a stable user id', async () => {
    kinde.isAuthenticated.mockResolvedValue(true);
    kinde.getUser.mockResolvedValue({ id: 'user_123' });
    const { getCurrentUser, requireUser } = await import('@/lib/auth');

    await expect(getCurrentUser()).resolves.toEqual({ id: 'user_123' });
    await expect(requireUser()).resolves.toEqual({ id: 'user_123' });
  });

  it('throws AuthError when authenticated session data is missing an id', async () => {
    kinde.isAuthenticated.mockResolvedValue(true);
    kinde.getUser.mockResolvedValue({});
    const { AuthError, requireUser } = await import('@/lib/auth');

    await expect(requireUser()).rejects.toMatchObject({
      name: 'AuthError',
      message: 'Unauthorized',
      status: 401,
    });
    expect(new AuthError()).toMatchObject({ name: 'AuthError', status: 401 });
  });
});
