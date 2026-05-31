import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getHolidays } from '@/app/api/holidays/route';
import { countryToCode, getHolidaysInRange, getPublicHolidays, getUpcomingHolidays } from '@/lib/holidays';

describe('holiday provider normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it('requires a country code and defaults the year from the current clock', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2029-04-15T00:00:00Z'));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPublicHolidays('', 2027)).rejects.toThrow('Country code is required');
    await expect(getPublicHolidays('fr')).resolves.toEqual([]);

    expect(String(fetchMock.mock.calls[0][0])).toContain('/publicholidays/2029/FR');
  });

  it('fails closed on empty upstream responses instead of treating missing data as no holidays', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));

    await expect(getPublicHolidays('US', 2027)).rejects.toThrow('empty response');
  });

  it('fails closed on malformed upstream payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not-json', { status: 200 })));

    await expect(getPublicHolidays('US', 2027)).rejects.toThrow('invalid JSON');
  });

  it('fails closed on provider HTTP errors and unexpected payload shapes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('[]', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ date: '2027-01-01' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPublicHolidays('US', 2027)).rejects.toThrow('Holidays API HTTP 503');
    await expect(getPublicHolidays('US', 2027)).rejects.toThrow('unexpected payload');
  });

  it('surfaces provider request timeouts as unavailable holiday data', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));

    const request = getPublicHolidays('US', 2027);
    const assertion = expect(request).rejects.toThrow('Holidays request timed out');

    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });

  it('normalizes country names without requiring exact casing', () => {
    expect(countryToCode(' france ')).toBe('FR');
    expect(countryToCode('UNITED KINGDOM')).toBe('GB');
    expect(countryToCode('uae')).toBe('AE');
    expect(countryToCode('south korea')).toBe('KR');
    expect(countryToCode('unknown')).toBeNull();
    expect(countryToCode(null)).toBeNull();
  });

  it('loads holidays across year boundaries and validates date ranges before upstream lookup', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { date: '2026-12-25', name: 'Christmas Day', localName: 'Christmas Day', countryCode: 'US', fixed: true, global: true, types: ['Public'] },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { date: '2027-01-01', name: 'New Year', localName: 'New Year', countryCode: 'US', fixed: true, global: true, types: ['Public'] },
      ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getHolidaysInRange('US', '2026-12-24', '2027-01-02')).resolves.toEqual([
      expect.objectContaining({ date: '2026-12-25' }),
      expect.objectContaining({ date: '2027-01-01' }),
    ]);
    await expect(getHolidaysInRange('US', '2026/02/28', '2026-03-02')).rejects.toThrow('checkIn must be YYYY-MM-DD');
    await expect(getHolidaysInRange('US', '2026-02-30', '2026-03-02')).rejects.toThrow('checkIn must be a valid date');
    await expect(getHolidaysInRange('US', '2026-03-02', '2026-03-02')).rejects.toThrow('checkIn must be before checkOut');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('computes upcoming holiday distance from the current clock and includes next year near year end', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T00:00:00Z'));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { date: '2026-11-15', name: 'Republic Day', localName: 'Republic Day', countryCode: 'US', fixed: true, global: true, types: ['Public'] },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { date: '2027-01-01', name: 'New Year', localName: 'New Year', countryCode: 'US', fixed: true, global: true, types: ['Public'] },
      ]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getUpcomingHolidays('US')).resolves.toEqual([
      expect.objectContaining({ date: '2026-11-15', daysAway: 14 }),
      expect.objectContaining({ date: '2027-01-01', daysAway: 61 }),
    ]);
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

  it('returns a no-store 400 for invalid holiday date ranges instead of a server error', async () => {
    const response = await getHolidays(new Request(
      'http://localhost:3000/api/holidays?country=france&checkIn=2027-02-30&checkOut=2027-03-02'
    ));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('checkIn must be a valid date');
  });
});
