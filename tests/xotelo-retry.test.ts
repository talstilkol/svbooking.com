import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Track fetch calls to verify retry behavior
const fetchCalls: Array<{ url: string; attempt: number }> = [];
let fetchAttempt = 0;
let fetchBehavior: 'succeed' | 'fail-then-succeed' | 'always-fail' | 'timeout-then-succeed' = 'succeed';

vi.stubGlobal('fetch', vi.fn(async (url: string) => {
  fetchAttempt++;
  fetchCalls.push({ url, attempt: fetchAttempt });

  if (fetchBehavior === 'succeed') {
    return new Response(JSON.stringify({ result: { rates: [{ name: 'Booking.com', rate: 100, tax: 20 }], currency: 'USD' } }), { status: 200 });
  }

  if (fetchBehavior === 'fail-then-succeed') {
    if (fetchAttempt === 1) {
      return new Response('Server Error', { status: 500 });
    }
    return new Response(JSON.stringify({ result: { rates: [{ name: 'Booking.com', rate: 100, tax: 20 }], currency: 'USD' } }), { status: 200 });
  }

  if (fetchBehavior === 'timeout-then-succeed') {
    if (fetchAttempt === 1) {
      const err = new Error('Xotelo request timed out after 6000ms');
      err.name = 'AbortError';
      throw err;
    }
    return new Response(JSON.stringify({ result: { rates: [{ name: 'Booking.com', rate: 100, tax: 20 }], currency: 'USD' } }), { status: 200 });
  }

  if (fetchBehavior === 'always-fail') {
    return new Response('Server Error', { status: 500 });
  }

  return new Response('Not Found', { status: 404 });
}));

import { getRates } from '@/lib/xotelo';

describe('xotelo retry', () => {
  beforeEach(() => {
    fetchCalls.length = 0;
    fetchAttempt = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('succeeds on first attempt without retrying', async () => {
    fetchBehavior = 'succeed';
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    expect(result.rates).toHaveLength(1);
    expect(fetchCalls).toHaveLength(1);
  });

  it('retries once on 500 and succeeds', async () => {
    fetchBehavior = 'fail-then-succeed';
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    expect(result.rates).toHaveLength(1);
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[0].attempt).toBe(1);
    expect(fetchCalls[1].attempt).toBe(2);
  });

  it('retries once on timeout and succeeds', async () => {
    fetchBehavior = 'timeout-then-succeed';
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' });

    expect(result.rates).toHaveLength(1);
    expect(fetchCalls).toHaveLength(2);
  });

  it('throws after retry also fails', async () => {
    fetchBehavior = 'always-fail';
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03' })
    ).rejects.toThrow('Xotelo HTTP 500');

    // Should have attempted twice (original + 1 retry)
    expect(fetchCalls).toHaveLength(2);
  });
});
