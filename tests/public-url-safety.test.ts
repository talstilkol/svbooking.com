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
    expect(normalizeHttpsUrl('https://10.0.0.5/internal')).toBeNull();
    expect(normalizeHttpsUrl('')).toBeNull();
    expect(normalizeHttpsUrl(null)).toBeNull();
  });
});
