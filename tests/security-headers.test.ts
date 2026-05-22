import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';

function getHeaderValue(headers: { key: string; value: string }[], key: string) {
  return headers.find((header) => header.key === key)?.value;
}

describe('security headers', () => {
  it('keeps hardened CSP directives on the global route', async () => {
    const headerRules = await nextConfig.headers?.();
    const globalRule = headerRules?.find((rule) => rule.source === '/(.*)');
    expect(globalRule).toBeDefined();

    const csp = getHeaderValue(globalRule?.headers || [], 'Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('sends core browser security headers', async () => {
    const headerRules = await nextConfig.headers?.();
    const globalRule = headerRules?.find((rule) => rule.source === '/(.*)');
    const headers = globalRule?.headers || [];

    expect(getHeaderValue(headers, 'X-Content-Type-Options')).toBe('nosniff');
    expect(getHeaderValue(headers, 'X-Frame-Options')).toBe('DENY');
    expect(getHeaderValue(headers, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(getHeaderValue(headers, 'Strict-Transport-Security')).toContain('includeSubDomains');
  });
});
