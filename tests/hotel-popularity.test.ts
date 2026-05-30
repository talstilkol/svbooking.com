import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const popularityStore = new Map<string, unknown>();

vi.mock('@/lib/kv', () => ({
  kv: {
    get: vi.fn(async (key: string) => popularityStore.get(key) ?? null),
    setWithTTL: vi.fn(async (key: string, value: unknown) => {
      popularityStore.set(key, value);
    }),
  },
}));

const { kv } = await import('@/lib/kv');
const {
  bumpHotelPopularity,
  getHotelPopularity,
  getTopPopularHotelKeys,
} = await import('@/lib/hotel-popularity');

describe('hotel popularity counters', () => {
  beforeEach(() => {
    popularityStore.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches valid TripAdvisor hotel-key bumps and ignores invalid keys', async () => {
    bumpHotelPopularity('g187147-d188728');
    bumpHotelPopularity('g187147-d188728');
    bumpHotelPopularity('g186338-d193089');
    bumpHotelPopularity('not-a-hotel-key');
    bumpHotelPopularity('g1-d1<script>');

    await vi.advanceTimersByTimeAsync(30_000);

    expect(kv.setWithTTL).toHaveBeenCalledWith('hotel-popularity', {
      'g187147-d188728': 2,
      'g186338-d193089': 1,
    }, 604800);
  });

  it('merges bumps into existing sanitized popularity data', async () => {
    popularityStore.set('hotel-popularity', {
      'g187147-d188728': '3',
      'not-valid': 100,
      'g186338-d193089': -2,
      'g293984-d301497': Number.NaN,
    });

    bumpHotelPopularity('g187147-d188728');
    bumpHotelPopularity('g293984-d301497');

    await vi.advanceTimersByTimeAsync(30_000);

    expect(popularityStore.get('hotel-popularity')).toEqual({
      'g187147-d188728': 4,
      'g293984-d301497': 1,
    });
  });

  it('returns sanitized popularity and bounded top keys', async () => {
    popularityStore.set('hotel-popularity', {
      'g187147-d188728': 9,
      'g186338-d193089': 4.7,
      'g293984-d301497': 2,
      'bad-key': 100,
      'g000-d000': 0,
    });

    await expect(getHotelPopularity()).resolves.toEqual({
      'g187147-d188728': 9,
      'g186338-d193089': 4,
      'g293984-d301497': 2,
    });
    await expect(getTopPopularHotelKeys(2.9)).resolves.toEqual([
      'g187147-d188728',
      'g186338-d193089',
    ]);
    await expect(getTopPopularHotelKeys(-1)).resolves.toHaveLength(3);
  });

  it('fails closed to empty popularity when KV is unavailable', async () => {
    vi.mocked(kv.get).mockRejectedValueOnce(new Error('KV unavailable'));

    await expect(getHotelPopularity()).resolves.toEqual({});
  });
});
