import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getHolidays } from '@/app/api/holidays/route';
import { getPublicHolidays } from '@/lib/holidays';

describe('holiday provider normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes public holidays from the upstream provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{
      date: '2027-01-01',
      name: 'New Year',
      localName: 'New Year',
      countryCode: 'US',
      fixed: true,
      global: true,
      types: ['Public'],
    }]), { status: 200 })));

    const holidays = await getPublicHolidays('US', 2027);

    expect(holidays).toEqual([{
      date: '2027-01-01',
      name: 'New Year',
      localName: 'New Year',
      countryCode: 'US',
      fixed: true,
      global: true,
      types: ['Public'],
    }]);
  });

  it('fails closed on empty upstream responses instead of treating missing data as no holidays', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));

    await expect(getPublicHolidays('US', 2027)).rejects.toThrow('empty response');
  });

  it('fails closed on malformed upstream payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not-json', { status: 200 })));

    await expect(getPublicHolidays('US', 2027)).rejects.toThrow('invalid JSON');
  });

  it('returns an explicit unavailable state for optional holiday intelligence provider gaps', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));

    const response = await getHolidays(new Request(
      'http://localhost:3000/api/holidays?countryCode=US&checkIn=2027-01-10&checkOut=2027-01-12'
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({
      error: 'Holiday data unavailable',
      holidays: [],
      hasHoliday: null,
      source: 'Nager.Date',
      sourceStatus: 'unavailable',
    });
  });
});
