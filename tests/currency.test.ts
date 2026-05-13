import { describe, it, expect } from 'vitest';
import {
  CURRENCIES,
  EXCHANGE_RATES,
  formatPrice,
  convertPrice,
  detectCurrency,
} from '@/lib/currency';

describe('currency', () => {
  describe('CURRENCIES', () => {
    it('has at least 10 currencies', () => {
      expect(CURRENCIES.length).toBeGreaterThanOrEqual(10);
    });

    it('includes USD, EUR, GBP', () => {
      const codes = CURRENCIES.map((c) => c.code);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('GBP');
    });

    it('each currency has code, symbol, and name', () => {
      for (const c of CURRENCIES) {
        expect(c.code).toBeTruthy();
        expect(c.symbol).toBeTruthy();
        expect(c.name).toBeTruthy();
      }
    });
  });

  describe('EXCHANGE_RATES', () => {
    it('has USD as base (rate = 1)', () => {
      expect(EXCHANGE_RATES.USD).toBe(1);
    });

    it('has a rate for every currency', () => {
      for (const c of CURRENCIES) {
        expect(EXCHANGE_RATES[c.code]).toBeGreaterThan(0);
      }
    });
  });

  describe('convertPrice', () => {
    it('converts USD to EUR', () => {
      const result = convertPrice(100, 'EUR');
      expect(result).toBe(100 * EXCHANGE_RATES.EUR);
    });

    it('returns original for USD', () => {
      expect(convertPrice(100, 'USD')).toBe(100);
    });

    it('returns original for unknown currency', () => {
      expect(convertPrice(100, 'XYZ')).toBe(100);
    });

    it('handles zero', () => {
      expect(convertPrice(0, 'EUR')).toBe(0);
    });
  });

  describe('formatPrice', () => {
    it('formats USD correctly', () => {
      const result = formatPrice(100, 'USD');
      expect(result).toContain('100');
      expect(result).toContain('$');
    });

    it('converts and formats EUR', () => {
      const result = formatPrice(100, 'EUR');
      expect(result).toContain('€');
    });

    it('converts and formats JPY', () => {
      const result = formatPrice(100, 'JPY');
      expect(result).toContain('¥');
    });
  });

  describe('detectCurrency', () => {
    it('returns USD on server (no window)', () => {
      // In Node.js test environment, window is undefined
      const result = detectCurrency();
      expect(result).toBe('USD');
    });
  });
});
