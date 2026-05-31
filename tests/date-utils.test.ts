import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, toIsoDate } from '@/lib/utils/date';

describe('date utils', () => {
  it('formats Date and parseable string values as ISO dates', () => {
    expect(toIsoDate(new Date('2026-06-01T12:30:00.000Z'))).toBe('2026-06-01');
    expect(toIsoDate('2026-06-02T00:00:00.000Z')).toBe('2026-06-02');
  });

  it('returns null for invalid date inputs', () => {
    expect(toIsoDate('not-a-date')).toBeNull();
    expect(daysBetween('2026-06-01', 'not-a-date')).toBeNull();
    expect(daysBetween('not-a-date', '2026-06-02')).toBeNull();
  });

  it('adds days and calculates rounded day differences deterministically', () => {
    expect(addDays('2026-06-01', 4)).toBe('2026-06-05');
    expect(daysBetween('2026-06-01T12:00:00.000Z', '2026-06-03T00:00:00.000Z')).toBe(2);
  });
});
