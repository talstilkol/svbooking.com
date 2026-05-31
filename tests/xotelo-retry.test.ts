import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Track fetch calls to verify retry behavior
const fetchCalls: Array<{ url: string; attempt: number }> = [];
let fetchAttempt = 0;
let fetchBehavior:
  | 'succeed'
  | 'fail-then-succeed'
  | 'always-fail'
  | 'timeout-then-succeed'
  | 'fetch-failed-then-succeed'
  | 'fetch-failed-short-budget'
  | 'error-with-rates'
  | 'error-no-rates'
  | 'no-result'
  | 'heatmap-success' = 'succeed';

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

  if (fetchBehavior === 'fetch-failed-then-succeed') {
    if (fetchAttempt === 1) {
      throw new Error('fetch failed');
    }
    return new Response(JSON.stringify({ result: { rates: [{ name: 'Booking.com', rate: 100, tax: 20 }], currency: 'USD' } }), { status: 200 });
  }

  if (fetchBehavior === 'fetch-failed-short-budget') {
    throw new Error('fetch failed');
  }

  if (fetchBehavior === 'always-fail') {
    return new Response('Server Error', { status: 500 });
  }

  if (fetchBehavior === 'error-with-rates') {
    // Xotelo sometimes returns error=true but still includes partial rates
    return new Response(JSON.stringify({
      error: true,
      result: { rates: [{ name: 'Booking.com', rate: 80, tax: 10 }], currency: 'USD' },
    }), { status: 200 });
  }

  if (fetchBehavior === 'error-no-rates') {
    return new Response(JSON.stringify({ error: true, result: { rates: [] } }), { status: 200 });
  }

  if (fetchBehavior === 'no-result') {
    return new Response(JSON.stringify({}), { status: 200 });
  }

  if (fetchBehavior === 'heatmap-success') {
    return new Response(JSON.stringify({ result: { rates: [{ date: '2026-06-01', rate: 120 }] } }), { status: 200 });
  }

  return new Response('Not Found', { status: 404 });
}));

import { getHeatmap, getRates } from '@/lib/xotelo';

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
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 10000 });

    expect(result.rates).toHaveLength(1);
    expect(fetchCalls).toHaveLength(1);
  });

  it('normalizes request parameters before calling Xotelo', async () => {
    fetchBehavior = 'succeed';
    const result = await getRates({
      hotelKey: ' g1-d1 ',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
      currency: 'eur',
      timeoutMs: 10000,
    });
    const url = new URL(fetchCalls[0].url);

    expect(result.rates).toHaveLength(1);
    expect(url.searchParams.get('hotel_key')).toBe('g1-d1');
    expect(url.searchParams.get('currency')).toBe('EUR');
  });

  it('uses deterministic defaults for empty optional request settings', async () => {
    fetchBehavior = 'succeed';
    const result = await getRates({
      hotelKey: 'g1-d1',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
      currency: '',
    });
    const url = new URL(fetchCalls[0].url);

    expect(result.rates).toHaveLength(1);
    expect(url.searchParams.get('currency')).toBe('USD');
  });

  it('retries once on 500 and succeeds', async () => {
    fetchBehavior = 'fail-then-succeed';
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 10000 });

    expect(result.rates).toHaveLength(1);
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[0].attempt).toBe(1);
    expect(fetchCalls[1].attempt).toBe(2);
  });

  it('retries once on timeout and succeeds', async () => {
    fetchBehavior = 'timeout-then-succeed';
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 10000 });

    expect(result.rates).toHaveLength(1);
    expect(fetchCalls).toHaveLength(2);
  });

  it('retries once on network fetch failures and succeeds', async () => {
    fetchBehavior = 'fetch-failed-then-succeed';
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 10000 });

    expect(result.rates).toHaveLength(1);
    expect(fetchCalls).toHaveLength(2);
  });

  it('throws after retry also fails', async () => {
    fetchBehavior = 'always-fail';
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 10000 })
    ).rejects.toThrow('Xotelo HTTP 500');

    // Should have attempted twice (original + 1 retry)
    expect(fetchCalls).toHaveLength(2);
  });

  it('does not retry when the timeout budget cannot cover a retry', async () => {
    fetchBehavior = 'always-fail';
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 1000 })
    ).rejects.toThrow('Xotelo HTTP 500');

    expect(fetchCalls).toHaveLength(1);
  });

  it('does not retry transient network failures when the timeout budget is too small', async () => {
    fetchBehavior = 'fetch-failed-short-budget';
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 1000 })
    ).rejects.toThrow('fetch failed');

    expect(fetchCalls).toHaveLength(1);
  });

  it('extracts partial rates even when error flag is set', async () => {
    fetchBehavior = 'error-with-rates';
    const result = await getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 10000 });

    // Should return the rates despite the error flag
    expect(result.rates).toHaveLength(1);
    expect(result.rates[0].rate).toBe(80);
  });

  it('throws when error flag is set and no rates are available', async () => {
    fetchBehavior = 'error-no-rates';
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 10000 })
    ).rejects.toThrow('Xotelo: rates unavailable');
  });

  it('returns an empty rate result when Xotelo sends no error and no result payload', async () => {
    fetchBehavior = 'no-result';

    await expect(getRates({
      hotelKey: 'g1-d1',
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
      timeoutMs: 10000,
    })).resolves.toEqual({ rates: [] });
  });

  it('fetches heatmap observations and surfaces heatmap-specific upstream failures', async () => {
    fetchBehavior = 'heatmap-success';

    await expect(getHeatmap({
      hotelKey: 'g1-d1',
      checkOut: '2026-06-03',
      timeoutMs: 10000,
    })).resolves.toEqual({ rates: [{ date: '2026-06-01', rate: 120 }] });

    fetchCalls.length = 0;
    fetchAttempt = 0;
    fetchBehavior = 'error-no-rates';
    await expect(getHeatmap({
      hotelKey: 'g1-d1',
      checkOut: '2026-06-03',
      timeoutMs: 10000,
    })).rejects.toThrow('Xotelo: heatmap unavailable');

    fetchCalls.length = 0;
    fetchAttempt = 0;
    fetchBehavior = 'always-fail';
    await expect(getHeatmap({
      hotelKey: 'g1-d1',
      checkOut: '2026-06-03',
      timeoutMs: 1000,
    })).rejects.toThrow('Xotelo HTTP 500');
    expect(fetchCalls).toHaveLength(1);
  });

  it('rejects invalid request parameters before calling Xotelo', async () => {
    fetchBehavior = 'succeed';

    await expect(getRates()).rejects.toThrow('Xotelo hotelKey must be a valid TripAdvisor-style key');
    await expect(
      getRates({ hotelKey: 'missing', checkIn: '2026-06-01', checkOut: '2026-06-03' })
    ).rejects.toThrow('Xotelo hotelKey must be a valid TripAdvisor-style key');
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-02-30', checkOut: '2026-06-03' })
    ).rejects.toThrow('Xotelo checkIn must be a valid YYYY-MM-DD date');
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-03', checkOut: '2026-06-03' })
    ).rejects.toThrow('Xotelo checkIn must be before checkOut');
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', currency: 'US' })
    ).rejects.toThrow('Xotelo currency must be a valid ISO 4217 code');
    await expect(
      getRates({ hotelKey: 'g1-d1', checkIn: '2026-06-01', checkOut: '2026-06-03', timeoutMs: 0 })
    ).rejects.toThrow('Xotelo timeoutMs must be a positive number');

    expect(fetchCalls).toHaveLength(0);
  });

  it('validates heatmap input before calling Xotelo', async () => {
    fetchBehavior = 'succeed';

    await expect(getHeatmap({ hotelKey: 'missing', checkOut: '2026-06-03' }))
      .rejects.toThrow('Xotelo hotelKey must be a valid TripAdvisor-style key');
    await expect(getHeatmap({ hotelKey: 'g1-d1', checkOut: '2026-02-30' }))
      .rejects.toThrow('Xotelo checkOut must be a valid YYYY-MM-DD date');

    expect(fetchCalls).toHaveLength(0);
  });
});
