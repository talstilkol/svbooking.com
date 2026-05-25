import { describe, expect, it } from 'vitest';
import { withConcurrency } from '@/lib/agent-utils';

describe('withConcurrency', () => {
  it('processes all items with fixed delay', async () => {
    const items = [1, 2, 3];
    const results = await withConcurrency(items, 2, async (n) => n * 2, 0);

    expect(results.map((r) => r.value)).toEqual([2, 4, 6]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
  });

  it('handles errors without stopping other items', async () => {
    const items = [1, 2, 3];
    const results = await withConcurrency(items, 2, async (n) => {
      if (n === 2) throw new Error('fail');
      return n * 2;
    }, 0);

    expect(results[0]).toEqual({ status: 'fulfilled', value: 2 });
    expect(results[1].status).toBe('rejected');
    expect(results[2]).toEqual({ status: 'fulfilled', value: 6 });
  });

  it('accepts a delay function for adaptive throttling', async () => {
    const delays: number[] = [];
    const items = [
      { id: 1, cached: true },
      { id: 2, cached: false },
      { id: 3, cached: true },
    ];

    const results = await withConcurrency(items, 1, async (item) => {
      return { cached: item.cached };
    }, (r) => {
      const d = r?.value?.cached ? 0 : 50;
      delays.push(d);
      return d;
    });

    expect(results).toHaveLength(3);
    // First item cached → 0ms delay, second not cached → 50ms delay
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBe(50);
  });

  it('respects concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await withConcurrency(items, 3, async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
    }, 0);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});
