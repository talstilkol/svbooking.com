import { test, expect } from '@playwright/test';

test.describe('AI Agent API', () => {
  test('rejects missing params', async ({ request }) => {
    const res = await request.get('/api/agents/price-recommendation');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing required/i);
  });

  test('rejects invalid date order', async ({ request }) => {
    const res = await request.get('/api/agents/price-recommendation?hotelKey=g297930-d305178&checkIn=2026-06-05&checkOut=2026-06-01');
    expect(res.status()).toBe(400);
  });

  test('returns recommendation contract with evidence-aware reasoning', async ({ request }) => {
    const res = await request.get('/api/agents/price-recommendation?hotelKey=g297930-d305178&checkIn=2026-06-01&checkOut=2026-06-05');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.reasoning).toBeTruthy();
    expect(['LOWEST_VERIFIED_PRICE', 'NO_DATA']).toContain(body.verdict);

    if (body.verdict === 'LOWEST_VERIFIED_PRICE') {
      expect(body.recommended).toBeTruthy();
      expect(body.recommended.provider).toBeTruthy();
      expect(body.recommended.total).toBeGreaterThan(0);
      expect(body.ranked.length).toBeGreaterThan(0);
      expect(body.reasoning).toMatch(/provider-returned price only/i);
      body.ranked.forEach((r: { score: number; scoreBasis: string; trust?: number }) => {
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(1);
        expect(r.scoreBasis).toBe('verified-price');
        expect(r.trust).toBeUndefined();
      });
    } else {
      expect(body.recommended).toBeNull();
      expect(body.providerCount).toBe(0);
      expect(body.reasoning).toMatch(/No provider-returned offers/i);
    }
  });

  test('legacy endpoint advertises the canonical successor', async ({ request }) => {
    const res = await request.get('/api/agent?hotelKey=g297930-d305178&checkIn=2026-06-01&checkOut=2026-06-05');

    expect(res.ok()).toBeTruthy();
    expect(res.headers()['deprecation']).toBe('true');
    expect(res.headers()['link']).toContain('/api/agents/price-recommendation');
  });
});
