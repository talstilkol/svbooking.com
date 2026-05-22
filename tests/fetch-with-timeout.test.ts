import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJsonWithTimeout, fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchWithTimeout', () => {
  it('passes request options through with an abort signal', async () => {
    const fetchImpl = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(init?.cache).toBe('no-store');
      expect(init?.headers).toEqual({ Accept: 'application/json' });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response('ok', { status: 200 });
    });

    const response = await fetchWithTimeout('https://example.com/status', {
      timeoutMs: 1000,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(response.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('aborts slow external requests with a timeout error', async () => {
    vi.useFakeTimers();

    const fetchImpl = vi.fn((_input: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));

    const request = fetchWithTimeout('https://example.com/slow', {
      timeoutMs: 25,
      fetchImpl: fetchImpl as typeof fetch,
    });
    const assertion = expect(request).rejects.toThrow('External request timed out after 25ms');

    await vi.advanceTimersByTimeAsync(25);
    await assertion;
  });

  it('parses JSON only after successful HTTP responses', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: 'OK' }), { status: 200 }));

    const body = await fetchJsonWithTimeout('https://example.com/json', {
      timeoutMs: 1000,
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(body).toEqual({ status: 'OK' });
  });
});
