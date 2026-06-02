import { describe, it, expect } from 'vitest';
import { CORE_TRANSLATIONS } from '@/lib/i18n';

/**
 * Interpolated dictionary strings use {token} placeholders that the UI fills at
 * render time (e.g. interpolate(t('hdSavings'), { pct, currency, amount })). If a
 * translation drops or renames a token, interpolation silently leaves a literal
 * "{token}" on screen. This guards every key (not just a hand-picked few) so any
 * locale that diverges in placeholder set fails loudly.
 */
function tokensOf(value: string): string[] {
  return (value.match(/\{(\w+)\}/g) || []).sort();
}

const en = CORE_TRANSLATIONS.en as Record<string, string>;
const he = CORE_TRANSLATIONS.he as Record<string, string>;

describe('i18n placeholder parity (all keys)', () => {
  it('keeps the same {placeholder} set in he as in en for every interpolated key', () => {
    const mismatches: string[] = [];
    for (const key of Object.keys(en)) {
      if (!(key in he)) continue; // key parity is covered by the dictionary parity test
      const enTokens = tokensOf(en[key]);
      const heTokens = tokensOf(he[key]);
      if (JSON.stringify(enTokens) !== JSON.stringify(heTokens)) {
        mismatches.push(`${key}: en=[${enTokens.join(',')}] he=[${heTokens.join(',')}]`);
      }
    }
    expect(mismatches, `placeholder mismatches:\n${mismatches.join('\n')}`).toEqual([]);
  });

  it('does not leave unbalanced or empty {} braces in any value', () => {
    const offenders: string[] = [];
    for (const locale of ['en', 'he'] as const) {
      for (const [key, value] of Object.entries(CORE_TRANSLATIONS[locale])) {
        const str = String(value);
        const opens = (str.match(/\{/g) || []).length;
        const closes = (str.match(/\}/g) || []).length;
        if (opens !== closes || /\{\}/.test(str)) {
          offenders.push(`${locale}.${key}: "${str}"`);
        }
      }
    }
    expect(offenders, `unbalanced/empty braces:\n${offenders.join('\n')}`).toEqual([]);
  });
});
