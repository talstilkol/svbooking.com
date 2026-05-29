import { describe, it, expect } from 'vitest';
import { CATALOG_STATS } from '@/lib/catalog-stats';

describe('CATALOG_STATS', () => {
  it('exports numeric hotel count', () => {
    expect(typeof CATALOG_STATS.hotels).toBe('number');
    expect(CATALOG_STATS.hotels).toBeGreaterThan(0);
  });

  it('exports numeric city count', () => {
    expect(typeof CATALOG_STATS.cities).toBe('number');
    expect(CATALOG_STATS.cities).toBeGreaterThan(0);
  });

  it('exports numeric country count', () => {
    expect(typeof CATALOG_STATS.countries).toBe('number');
    expect(CATALOG_STATS.countries).toBeGreaterThan(0);
  });

  it('has more hotels than cities (sanity check)', () => {
    expect(CATALOG_STATS.hotels).toBeGreaterThan(CATALOG_STATS.cities);
  });

  it('has more cities than countries (sanity check)', () => {
    expect(CATALOG_STATS.cities).toBeGreaterThan(CATALOG_STATS.countries);
  });

  it('matches expected catalog size (502 hotels, 139 cities, 65 countries)', () => {
    expect(CATALOG_STATS.hotels).toBe(502);
    expect(CATALOG_STATS.cities).toBe(139);
    expect(CATALOG_STATS.countries).toBe(65);
  });
});
