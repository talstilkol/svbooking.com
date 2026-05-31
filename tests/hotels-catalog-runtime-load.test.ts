import { afterEach, describe, expect, it, vi } from 'vitest';

async function importCatalogWithDiscovered(discovered: unknown) {
  vi.resetModules();
  vi.doMock('@/lib/kv', () => ({
    kv: {
      get: vi.fn(async () => discovered),
    },
  }));
  return await import('@/lib/hotels-catalog');
}

describe('hotels catalog durable runtime load states', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/kv');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('accepts an empty durable discovery ledger without logging invented additions', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { getFullCatalog, HOTELS } = await importCatalogWithDiscovered([]);

    await expect(getFullCatalog()).resolves.toBe(HOTELS);

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('skips duplicate durable discovered hotels without changing runtime catalog size', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { getFullCatalog, HOTELS } = await importCatalogWithDiscovered([{
      hotelKey: 'g293984-d301497',
      name: 'Hilton Tel Aviv',
      city: 'Tel Aviv',
      country: 'Israel',
    }]);
    const before = HOTELS.length;

    await expect(getFullCatalog()).resolves.toBe(HOTELS);

    expect(HOTELS.length).toBe(before);
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
