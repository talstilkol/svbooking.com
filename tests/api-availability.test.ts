import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn((hotelKey: string) => (
    hotelKey === 'g187147-d188728'
      ? { hotelKey, name: 'Le Meurice', city: 'Paris', country: 'France' }
      : null
  )),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: 1_800_000_000_000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(async () => ({ rates: [], currency: 'USD', source: 'provider-registry' })),
}));

import { GET } from '@/app/api/agents/availability/route';
import { getCachedRates } from '@/lib/price-cache';

function request(query: string) {
  return new Request(`http://localhost:3000/api/agents/availability?${query}`);
}

describe('GET /api/agents/availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(getCachedRates).mockResolvedValue({ rates: [], currency: 'USD', source: 'provider-registry' });
  });

  it('does not construct booking links without provider-returned deep links', async () => {
    const response = await GET(request('hotelKey=g187147-d188728&checkIn=2027-06-01&checkOut=2027-06-03'));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.sourcePolicy).toBe('provider-returned-deep-links-only');
    expect(body.bookingLinks).toEqual([]);
    expect(body.results[0]).toMatchObject({
      provider: 'provider-returned availability',
      status: 'unavailable',
      available: false,
      deepLink: null,
    });
    expect(body.summary).toContain('Provider-returned availability links are unavailable');
    expect(serialized).not.toContain('booking.com/searchresults');
    expect(serialized).not.toContain('google.com/travel/hotels');
    expect(serialized).not.toContain('expedia.com/Hotel-Search');
    expect(serialized).not.toContain('agoda.com/search');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('localizes unavailable availability copy without constructing booking links', async () => {
    const response = await GET(request('hotelKey=g187147-d188728&checkIn=2027-06-01&checkOut=2027-06-03&locale=he'));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.sourcePolicy).toBe('provider-returned-deep-links-only');
    expect(body.bookingLinks).toEqual([]);
    expect(body.results[0]).toMatchObject({
      provider: 'זמינות שהוחזרה מספק',
      status: 'unavailable',
      available: false,
      deepLink: null,
      note: 'SV Booking לא בונה קישורי אתרי הזמנה ללא URL שהוחזר מספק.',
    });
    expect(body.summary).toContain('קישורי זמינות שהוחזרו מספקים אינם זמינים עבור Le Meurice');
    expect(body.note).toContain('קישורי הזמנה מוצגים רק כאשר ספק מחירים מוגדר מחזיר deepLink מאומת');
    expect(serialized).not.toContain('booking.com/searchresults');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns provider booking links only when a verified provider deep link exists', async () => {
    vi.mocked(getCachedRates).mockResolvedValueOnce({
      rates: [{
        provider: 'Booking.com',
        rate: 220,
        tax: 30,
        source: 'booking-provider',
        deepLink: 'https://www.booking.com/hotel/fr/le-meurice.html',
      }],
      currency: 'USD',
      source: 'provider-registry',
      freshness: 'live',
    });

    const response = await GET(request('hotelKey=g187147-d188728&checkIn=2027-06-01&checkOut=2027-06-03'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results[0]).toMatchObject({
      provider: 'Booking.com',
      status: 'provider-link-returned',
      available: true,
      deepLink: 'https://www.booking.com/hotel/fr/le-meurice.html',
      price: 250,
    });
    expect(body.bookingLinks).toEqual([
      { provider: 'Booking.com', url: 'https://www.booking.com/hotel/fr/le-meurice.html' },
    ]);
  });

  it('does not expose unsafe provider-returned deep links', async () => {
    vi.mocked(getCachedRates).mockResolvedValueOnce({
      rates: [{
        provider: 'Booking.com',
        total: 250,
        source: 'booking-provider',
        deepLink: 'javascript:alert(1)',
      }],
      currency: 'USD',
      source: 'provider-registry',
      freshness: 'live',
    });

    const response = await GET(request('hotelKey=g187147-d188728&checkIn=2027-06-01&checkOut=2027-06-03'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sourcePolicy).toBe('provider-returned-deep-links-only');
    expect(body.bookingLinks).toEqual([]);
    expect(body.results[0]).toMatchObject({
      status: 'unavailable',
      available: false,
      deepLink: null,
    });
    expect(JSON.stringify(body)).not.toContain('javascript:');
  });

  it('rejects unknown hotels instead of building fallback provider searches', async () => {
    const response = await GET(request('hotelKey=missing&checkIn=2027-06-01&checkOut=2027-06-03'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Hotel not found in catalog');
  });
});
