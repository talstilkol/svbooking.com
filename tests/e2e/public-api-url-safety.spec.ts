import { expect, test } from '@playwright/test';

const PUBLIC_API_URL_CASES = [
  { label: 'compare catalog', path: '/api/compare', allowedStatuses: [200] },
  { label: 'compare city catalog', path: '/api/compare?city=Paris', allowedStatuses: [200] },
  { label: 'compare hotel catalog', path: '/api/compare?hotelKey=g297930-d305178', allowedStatuses: [200] },
  { label: 'search catalog', path: '/api/search?city=Paris', allowedStatuses: [200] },
  { label: 'catalog stats', path: '/api/catalog/stats', allowedStatuses: [200] },
  { label: 'events unavailable state', path: '/api/events?city=Paris&startDate=2026-07-01&endDate=2026-07-31', allowedStatuses: [200] },
  { label: 'reviews unavailable state', path: '/api/reviews/g297930-d305178', allowedStatuses: [200] },
  { label: 'property content unavailable state', path: '/api/property-content/g297930-d305178', allowedStatuses: [200] },
  { label: 'price history unavailable state', path: '/api/price-history?hotelKey=g297930-d305178&period=30', allowedStatuses: [200] },
  { label: 'i18n payload', path: '/api/i18n?locale=he&date=2026-06-01&amount=120&currency=USD', allowedStatuses: [200] },
  { label: 'health readiness', path: '/api/health', allowedStatuses: [200, 503] },
];

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [a, b] = octets;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
  );
}

function isRestrictedIpv6(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host.includes(':')) return false;
  return (
    host === '::'
    || host === '::1'
    || host.startsWith('::ffff:')
    || host.startsWith('fc')
    || host.startsWith('fd')
    || host.startsWith('fe8')
    || host.startsWith('fe9')
    || host.startsWith('fea')
    || host.startsWith('feb')
  );
}

function isPrivateHostname(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/\.$/u, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  return isPrivateIpv4(host) || isRestrictedIpv6(host);
}

function publicUrlViolation(value: string) {
  const text = value.trim();
  if (!text) return null;
  if (/^(?:javascript|data):/iu.test(text)) return 'script/data URL';
  if (!/^https?:\/\//iu.test(text)) return null;

  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return 'non-HTTPS URL';
    if (url.username || url.password) return 'URL credentials';
    if (isPrivateHostname(url.hostname)) return 'private or local hostname';
    return null;
  } catch {
    return 'malformed absolute URL';
  }
}

function unsafeAbsoluteUrls(value: unknown, jsonPath = '$'): string[] {
  if (typeof value === 'string') {
    const violation = publicUrlViolation(value);
    return violation ? [`${jsonPath}: ${violation}: ${value}`] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => unsafeAbsoluteUrls(entry, `${jsonPath}[${index}]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => (
      unsafeAbsoluteUrls(entry, `${jsonPath}.${key}`)
    ));
  }

  return [];
}

test.describe('public API URL safety runtime audit', () => {
  for (const apiCase of PUBLIC_API_URL_CASES) {
    test(`${apiCase.label} returns no unsafe absolute URLs`, async ({ request }) => {
      const response = await request.get(apiCase.path);
      expect(apiCase.allowedStatuses).toContain(response.status());

      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');

      const body = await response.json();
      const unsafeUrls = unsafeAbsoluteUrls(body);

      expect(unsafeUrls, `${apiCase.path} returned unsafe URLs:\n${unsafeUrls.join('\n')}`).toEqual([]);
    });
  }
});
