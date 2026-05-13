import { describe, it, expect } from 'vitest';
import {
  parseNonNegativeNumber,
  parsePositiveInteger,
  parseDate,
  ValidationError,
  errorResponse,
} from '@/lib/validation';

describe('validation', () => {
  describe('parseNonNegativeNumber', () => {
    it('parses valid numbers', () => {
      expect(parseNonNegativeNumber('42', 'test')).toBe(42);
      expect(parseNonNegativeNumber('0', 'test')).toBe(0);
      expect(parseNonNegativeNumber('3.14', 'test')).toBeCloseTo(3.14);
    });

    it('returns null for empty/null/undefined', () => {
      expect(parseNonNegativeNumber(undefined, 'test')).toBeNull();
      expect(parseNonNegativeNumber(null, 'test')).toBeNull();
      expect(parseNonNegativeNumber('', 'test')).toBeNull();
    });

    it('throws for negative numbers', () => {
      expect(() => parseNonNegativeNumber('-1', 'price')).toThrow(ValidationError);
      expect(() => parseNonNegativeNumber('-1', 'price')).toThrow('Invalid price');
    });

    it('throws for non-numeric strings', () => {
      expect(() => parseNonNegativeNumber('abc', 'test')).toThrow(ValidationError);
    });
  });

  describe('parsePositiveInteger', () => {
    it('parses valid positive integers', () => {
      expect(parsePositiveInteger('1', 'test')).toBe(1);
      expect(parsePositiveInteger('100', 'test')).toBe(100);
    });

    it('throws for zero', () => {
      expect(() => parsePositiveInteger('0', 'count')).toThrow(ValidationError);
    });

    it('throws for negative numbers', () => {
      expect(() => parsePositiveInteger('-1', 'count')).toThrow(ValidationError);
    });

    it('throws for decimals', () => {
      expect(() => parsePositiveInteger('1.5', 'count')).toThrow(ValidationError);
    });
  });

  describe('parseDate', () => {
    it('parses valid ISO dates', () => {
      const d = parseDate('2025-06-15', 'checkIn');
      expect(d).toBeInstanceOf(Date);
      expect(d.getFullYear()).toBe(2025);
    });

    it('throws for invalid dates', () => {
      expect(() => parseDate('not-a-date', 'checkIn')).toThrow(ValidationError);
    });
  });

  describe('ValidationError', () => {
    it('has correct name and status', () => {
      const err = new ValidationError('bad input');
      expect(err.name).toBe('ValidationError');
      expect(err.status).toBe(400);
      expect(err.message).toBe('bad input');
    });

    it('supports custom status codes', () => {
      const err = new ValidationError('not found', 404);
      expect(err.status).toBe(404);
    });
  });

  describe('errorResponse', () => {
    it('returns 400 for ValidationError', async () => {
      const err = new ValidationError('bad input');
      const res = errorResponse(err);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('bad input');
    });

    it('returns 500 for unknown errors and hides details', async () => {
      const err = new Error('secret db connection string leaked');
      const res = errorResponse(err);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
      expect(body.error).not.toContain('secret');
    });

    it('handles errors with status property', async () => {
      const err = Object.assign(new Error('Unauthorized'), { status: 401 });
      const res = errorResponse(err);
      expect(res.status).toBe(401);
    });
  });
});
