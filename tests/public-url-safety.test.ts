import { describe, expect, it } from 'vitest';
import { normalizeHttpsUrl } from '@/lib/utils/public-url-safety';

describe('public URL safety helper', () => {
  it('keeps public HTTPS URLs and rejects unsafe public response links', () => {
    expect(normalizeHttpsUrl(' https://images.example.com/path?a=1 ')).toBe('https://images.example.com/path?a=1');
    expect(normalizeHttpsUrl(new URL('https://svbooking.com/hotel/g187147-d188728'))).toBe('https://svbooking.com/hotel/g187147-d188728');

    expect(normalizeHttpsUrl('http://images.example.com/path')).toBeNull();
    expect(normalizeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeHttpsUrl('data:text/html,hello')).toBeNull();
    expect(normalizeHttpsUrl('https://user:pass@images.example.com/path')).toBeNull();
    expect(normalizeHttpsUrl('https://localhost:3000/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://127.0.0.1/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://127.1/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://0x7f000001/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://2130706433/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://0177.0.0.1/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://10.0.0.5/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://100.64.0.1/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://169.254.10.20/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://172.16.0.1/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://172.31.255.255/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://192.168.1.5/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://198.18.0.1/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://app.localhost/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://public.example.com./path')).toBe('https://public.example.com./path');
    expect(normalizeHttpsUrl('https://8.8.8.8/path')).toBe('https://8.8.8.8/path');
    expect(normalizeHttpsUrl('https://[::]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[::1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[::ffff:127.0.0.1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[fc00::1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[fd00::1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[fe80::1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[fe90::1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[fea0::1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[feb0::1]/internal')).toBeNull();
    expect(normalizeHttpsUrl('https://[2001:4860:4860::8888]/dns-query')).toBe('https://[2001:4860:4860::8888]/dns-query');
    expect(normalizeHttpsUrl('https://[bad')).toBeNull();
    expect(normalizeHttpsUrl('')).toBeNull();
    expect(normalizeHttpsUrl(null)).toBeNull();
  });
});
