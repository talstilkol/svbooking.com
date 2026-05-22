import { describe, expect, it } from 'vitest';
import { GET as getI18n } from '@/app/api/i18n/route';
import {
  buildLocalePayload,
  formatLocalizedCurrency,
  formatLocalizedDate,
  getDictionary,
  getI18nReadiness,
  getLocaleConfig,
  getTranslation,
  resolveLocale,
} from '@/lib/i18n';

describe('i18n readiness', () => {
  it('declares English and Hebrew with RTL support', () => {
    const readiness = getI18nReadiness();

    expect(readiness.defaultLocale).toBe('en');
    expect(readiness.supportedLocales).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'en', dir: 'ltr' }),
        expect.objectContaining({ code: 'he', dir: 'rtl' }),
      ])
    );
    expect(readiness.contentTranslation).toBe('partial');
    expect(readiness.fallbackPolicy).toContain('English');
    expect(readiness.dictionaries.he).toBeGreaterThan(0);
    expect(getLocaleConfig('he').dir).toBe('rtl');
    expect(resolveLocale({ acceptLanguage: 'he-IL,he;q=0.9,en;q=0.8' }).code).toBe('he');
    expect(getTranslation('he', 'comparePrices')).toBe('השוואת מחירים');
    expect(getDictionary('he').providerSearchUnavailable).toBe('חיפוש ספק לא זמין');
    expect(formatLocalizedDate('2026-06-01', 'he')).toContain('2026');
    expect(formatLocalizedCurrency(120, 'he', 'USD')).toContain('120');
  });

  it('builds locale payloads with explicit fallback and formatting policy', () => {
    const payload = buildLocalePayload({
      locale: 'he-IL',
      sampleDate: '2026-06-01',
      sampleAmount: 120,
      currency: 'USD',
    } as Parameters<typeof buildLocalePayload>[0]);

    expect(payload.locale).toBe('he');
    expect(payload.dir).toBe('rtl');
    expect(payload.contentTranslation).toBe('partial');
    expect(payload.dictionary.priceUnavailable).toBe('מחיר לא זמין');
    expect(payload.formatting.date).toBeTruthy();
    expect(payload.formatting.currency).toBeTruthy();
    expect(payload.fallbackPolicy).toContain('unavailable');
  });

  it('exposes no-store public readiness metadata', async () => {
    const response = await getI18n(new Request('http://localhost:3000/api/i18n?locale=he&date=2026-06-01&amount=120&currency=USD'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.rtlSupported).toBe(true);
    expect(body.selected.locale).toBe('he');
    expect(body.selected.dir).toBe('rtl');
    expect(body.selected.formatting.date).toBeTruthy();
  });
});
