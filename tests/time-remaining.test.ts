import { describe, it, expect } from 'vitest';
import { getTimeRemaining, getDaysUntil } from '@/lib/time-remaining';

const NOW = Date.parse('2027-01-01T00:00:00Z');

describe('getTimeRemaining', () => {
  it('breaks a future span into days/hours/minutes/seconds', () => {
    const target = NOW + (2 * 86400000 + 3 * 3600000 + 4 * 60000 + 5 * 1000);
    const r = getTimeRemaining(new Date(target), NOW);
    expect(r).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5, expired: false });
  });

  it('marks past or equal targets as expired with zeroed parts', () => {
    expect(getTimeRemaining(new Date(NOW - 1000), NOW)).toMatchObject({
      days: 0, hours: 0, minutes: 0, seconds: 0, expired: true,
    });
    expect(getTimeRemaining(new Date(NOW), NOW).expired).toBe(true);
  });

  it('accepts an ISO string target', () => {
    const r = getTimeRemaining('2027-01-02T00:00:00Z', NOW);
    expect(r.days).toBe(1);
    expect(r.expired).toBe(false);
  });

  it('treats invalid dates as expired', () => {
    expect(getTimeRemaining('not-a-date', NOW).expired).toBe(true);
  });

  it('reports totalMs for the remaining span', () => {
    const r = getTimeRemaining(new Date(NOW + 5000), NOW);
    expect(r.totalMs).toBe(5000);
  });
});

describe('getDaysUntil', () => {
  it('rounds up partial days', () => {
    // 1 day + 1 hour ahead → ceil → 2
    expect(getDaysUntil(new Date(NOW + 86400000 + 3600000), NOW)).toBe(2);
  });

  it('returns 0 for past dates (never negative)', () => {
    expect(getDaysUntil(new Date(NOW - 86400000), NOW)).toBe(0);
  });

  it('returns 0 for invalid dates', () => {
    expect(getDaysUntil('garbage', NOW)).toBe(0);
  });
});
