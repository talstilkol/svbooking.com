import { test, expect } from '@playwright/test';

test.describe('AI Agent API', () => {
  test('rejects missing params', async ({ request }) => {
    const res = await request.get('/api/agent');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing required/i);
  });

  test('rejects invalid date order', async ({ request }) => {
    const res = await request.get('/api/agent?hotelKey=g297930-d305178&checkIn=2026-06-05&checkOut=2026-06-01');
    expect(res.status()).toBe(400);
  });

  test('returns ranked recommendation with reasoning', async ({ request }) => {
    const res = await request.get('/api/agent?hotelKey=g297930-d305178&checkIn=2026-06-01&checkOut=2026-06-05');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.recommended).toBeTruthy();
    expect(body.recommended.provider).toBeTruthy();
    expect(body.recommended.total).toBeGreaterThan(0);
    expect(body.reasoning).toBeTruthy();
    expect(body.ranked.length).toBeGreaterThan(0);
    expect(['CHEAPEST_AND_TRUSTED', 'BALANCED']).toContain(body.verdict);
    // All scores between 0 and 1
    body.ranked.forEach((r: { score: number; trust: number }) => {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(r.trust).toBeGreaterThan(0);
    });
  });
});
