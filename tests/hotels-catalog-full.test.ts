import { afterEach, describe, expect, it, vi } from 'vitest';

describe('full hotel catalog loader', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@/lib/kv');
  });

  it('keeps the static catalog when the discovered-hotel KV entry is not an array', async () => {
    vi.resetModules();
    vi.doMock('@/lib/kv', () => ({
      kv: {
        get: vi.fn(async () => null),
      },
    }));

    const { getFullCatalog } = await import('@/lib/hotels-catalog');

    await expect(getFullCatalog()).resolves.toHaveLength(502);
  });
});
