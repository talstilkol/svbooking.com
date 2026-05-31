import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCountryByName, getPrimaryCurrency } from '@/lib/countries';

describe('country metadata provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes sparse REST Countries payloads without inventing codes or currencies', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ name: { common: 'France' } }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: { common: 'Antarctica' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCountryByName('France')).resolves.toMatchObject({
      name: 'France',
      code: null,
      currencies: {},
    });
    await expect(getPrimaryCurrency('AQ')).resolves.toBeNull();
  });
});
