import { describe, expect, it } from 'vitest';
import { hashId } from '@/lib/utils/hashId';

describe('hashId', () => {
  it('returns the same ID for the same content', () => {
    const first = hashId('trip', 'g297930-d305178', '2026-06-01', '2026-06-05', 2);
    const second = hashId('trip', 'g297930-d305178', '2026-06-01', '2026-06-05', 2);
    expect(second).toBe(first);
  });

  it('changes when content changes', () => {
    const base = hashId('trip', 'g297930-d305178', '2026-06-01', '2026-06-05', 2);
    const changed = hashId('trip', 'g297930-d305178', '2026-06-01', '2026-06-06', 2);
    expect(changed).not.toBe(base);
  });

  it('uses a stable URL-safe shape', () => {
    expect(hashId('toast', 'success', 'Saved', 1)).toMatch(/^h_[0-9a-z]+$/);
  });

  it('normalizes nullish parts deterministically', () => {
    expect(hashId('nullable', null, undefined, '')).toBe(hashId('nullable', '', '', ''));
  });
});
