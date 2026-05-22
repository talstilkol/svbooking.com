import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hotels-catalog', () => ({
  findHotel: vi.fn(),
  getHotelsByCountry: vi.fn(() => []),
}));

vi.mock('@/lib/price-cache', () => ({
  getCachedRates: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: vi.fn(async () => ({ success: true, reset: Date.now() + 60000 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimitResponse: vi.fn((reset: number) => Response.json({ error: 'Rate limit exceeded', reset }, { status: 429 })),
}));

import { POST } from '@/app/api/agents/recommendations/route';

function postRecommendations(headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/agents/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ favorites: [], trips: [] }),
  });
}

describe('POST /api/agents/recommendations', () => {
  it('rejects cross-origin agent recommendation mutations', async () => {
    const response = await POST(postRecommendations({ origin: 'https://evil.example' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.error).toBe('Same-origin request required');
  });
});
