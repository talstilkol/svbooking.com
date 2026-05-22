import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({ id: 'user-1' })),
}));

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => store.get(key) || null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    isConfigured: vi.fn(async () => false),
  },
}));

import { GET as getFavorites } from '@/app/api/me/favorites/route';
import { GET as getPrefs } from '@/app/api/me/prefs/route';

describe('/api/me private response caching', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it('marks favorites responses as no-store', async () => {
    const res = await getFavorites();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('marks prefs responses as no-store and returns boolean cloud status', async () => {
    const res = await getPrefs();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');

    const body = await res.json();
    expect(body.cloudEnabled).toBe(false);
  });
});
