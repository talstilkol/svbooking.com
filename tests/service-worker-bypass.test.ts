import { readFile } from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function createServiceWorkerHarness(source: string) {
  const listeners = new Map<string, (event: { request?: unknown; respondWith?: () => void; waitUntil?: () => void }) => void>();
  const fetchMock = vi.fn(() => Promise.resolve(new Response('ok', { headers: { date: new Date().toUTCString() } })));

  const cacheStore = new Map<string, Response>();
  const mockCache = {
    match: vi.fn(async (req: { url: string }) => cacheStore.get(req.url) ?? null),
    put: vi.fn(async (req: { url: string }, res: Response) => { cacheStore.set(req.url, res); }),
  };

  const self = {
    location: { origin: 'https://sv-booking.local' },
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn(),
      matchAll: vi.fn(),
      openWindow: vi.fn(),
    },
    registration: {
      showNotification: vi.fn(),
    },
    addEventListener: (type: string, handler: (event: { request?: unknown; respondWith?: () => void; waitUntil?: () => void }) => void) => {
      listeners.set(type, handler);
    },
  };

  const context = createContext({
    URL,
    Date,
    Response,
    Promise,
    Infinity,
    self,
    fetch: fetchMock,
    caches: {
      open: vi.fn(async () => mockCache),
      keys: vi.fn(async () => []),
      match: vi.fn(),
    },
  });

  new Script(source, { filename: 'public/sw.js' }).runInContext(context);

  const fetchListener = listeners.get('fetch');
  if (!fetchListener) throw new Error('Service worker fetch listener was not registered');

  return { fetchListener, fetchMock, mockCache };
}

describe('service worker cache bypass rules', () => {
  it.each([
    ['non-compare API requests', 'https://sv-booking.local/api/agents', 'GET', 'cors'],
    ['private agents pages', 'https://sv-booking.local/agents', 'GET', 'navigate'],
    ['private dashboard pages', 'https://sv-booking.local/dashboard', 'GET', 'navigate'],
    ['private nested favorites pages', 'https://sv-booking.local/favorites/hotel-1', 'GET', 'navigate'],
    ['non-GET same-origin requests', 'https://sv-booking.local/search', 'POST', 'cors'],
    ['cross-origin requests', 'https://provider.example/hotel', 'GET', 'cors'],
  ])('does not intercept %s', async (_label, url, method, mode) => {
    const source = await readFile('public/sw.js', 'utf8');
    const { fetchListener } = createServiceWorkerHarness(source);
    const respondWith = vi.fn();

    fetchListener({
      request: { url, method, mode },
      respondWith,
    });

    expect(respondWith).not.toHaveBeenCalled();
  });

  it('intercepts price compare GET requests for SW caching', async () => {
    const source = await readFile('public/sw.js', 'utf8');
    const { fetchListener, fetchMock } = createServiceWorkerHarness(source);
    const respondWith = vi.fn();
    const waitUntil = vi.fn();

    fetchListener({
      request: {
        url: 'https://sv-booking.local/api/compare?hotelKey=g1-d1&checkIn=2026-06-01&checkOut=2026-06-03&currency=USD',
        method: 'GET',
        mode: 'cors',
      },
      respondWith,
      waitUntil,
    });

    // Should be intercepted (respondWith called) for caching
    expect(respondWith).toHaveBeenCalledTimes(1);
  });

  it('bypasses API routes that are not price compare', async () => {
    const source = await readFile('public/sw.js', 'utf8');
    const { fetchListener } = createServiceWorkerHarness(source);
    const respondWith = vi.fn();

    fetchListener({
      request: {
        url: 'https://sv-booking.local/api/compare?city=Paris',
        method: 'GET',
        mode: 'cors',
      },
      respondWith,
    });

    // No hotelKey + checkIn → not a price compare request → bypassed
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('still handles public same-origin navigation with the offline fallback strategy', async () => {
    const source = await readFile('public/sw.js', 'utf8');
    const { fetchListener, fetchMock } = createServiceWorkerHarness(source);
    const respondWith = vi.fn();

    fetchListener({
      request: {
        url: 'https://sv-booking.local/search?city=Paris',
        method: 'GET',
        mode: 'navigate',
      },
      respondWith,
    });

    expect(respondWith).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
