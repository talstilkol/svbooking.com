import { describe, it, expect } from 'vitest';
import { CORE_TRANSLATIONS, getDictionary, getTranslation } from '@/lib/i18n';

describe('i18n dictionary parity', () => {
  it('has identical key sets for en and he (no missing translations)', () => {
    const enKeys = Object.keys(CORE_TRANSLATIONS.en).sort();
    const heKeys = Object.keys(CORE_TRANSLATIONS.he).sort();
    const missingInHe = enKeys.filter((k) => !heKeys.includes(k));
    const missingInEn = heKeys.filter((k) => !enKeys.includes(k));
    expect(missingInHe, `keys missing in he: ${missingInHe.join(', ')}`).toEqual([]);
    expect(missingInEn, `keys missing in en: ${missingInEn.join(', ')}`).toEqual([]);
  });

  it('has no empty string values in either locale', () => {
    for (const locale of ['en', 'he'] as const) {
      for (const [key, value] of Object.entries(CORE_TRANSLATIONS[locale])) {
        expect(String(value).length, `${locale}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('preserves {placeholder} tokens across locales for interpolated strings', () => {
    const tokenKeys = ['searchSubtext', 'faqA4', 'noHotelsTitle', 'trySearchingDesc'];
    for (const key of tokenKeys) {
      const en = (CORE_TRANSLATIONS.en as Record<string, string>)[key];
      const he = (CORE_TRANSLATIONS.he as Record<string, string>)[key];
      const enTokens = (en.match(/\{(\w+)\}/g) || []).sort();
      const heTokens = (he.match(/\{(\w+)\}/g) || []).sort();
      expect(heTokens, `token mismatch for ${key}`).toEqual(enTokens);
    }
  });

  it('falls back to English for an unknown locale, and to the key for an unknown key', () => {
    expect(getTranslation('xx', 'searchTitle')).toBe('Find a Hotel');
    expect(getTranslation('he', 'searchTitle')).toBe('מצא מלון');
    expect(getTranslation('en', 'definitely-not-a-key')).toBe('definitely-not-a-key');
  });

  it('getDictionary merges English defaults under the active locale', () => {
    const he = getDictionary('he');
    // Every English key is present (he-complete via parity, but guard the merge)
    for (const k of Object.keys(CORE_TRANSLATIONS.en)) {
      expect(he).toHaveProperty(k);
    }
  });
});
