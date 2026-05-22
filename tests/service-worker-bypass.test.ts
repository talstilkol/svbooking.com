import { readFile } from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function createServiceWorkerHarness(source: string) {
  const listeners = new Map<string, (event: { request?: unknown; respondWith?: () => void }) => void>();
  const fetchMock = vi.fn(() => Promise.resolve(new Response('ok')));

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
    addEventListener: (type: string, handler: (event: { request?: unknown; respondWith?: () => void }) => void) => {
      listeners.set(type, handler);
    },
  };

  const context = createContext({
    URL,
    Response,
    Promise,
    self,
    fetch: fetchMock,
    caches: {
      open: vi.fn(),
      keys: vi.fn(),
      match: vi.fn(),
    },
  });

  new Script(source, { filename: 'public/sw.js' }).runInContext(context);

  const fetchListener = listeners.get('fetch');
  if (!fetchListener) throw new Error('Service worker fetch listener was not registered');

  return { fetchListener, fetchMock };
}

describe('service worker cache bypass rules', () => {
  it.each([
    ['API requests', 'https://sv-booking.local/api/compare', 'GET', 'cors'],
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
