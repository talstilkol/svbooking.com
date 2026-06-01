import { describe, expect, it } from 'vitest';
import { privacyEn, privacyHe, termsEn, termsHe } from '@/lib/legal-content';

function flattenLegalText(document: { title: string; lastUpdated: string; disclaimer?: string; sections: readonly { heading: string; body?: string; list?: readonly string[]; bodyAfter?: string }[] }) {
  return [
    document.title,
    document.lastUpdated,
    document.disclaimer,
    ...document.sections.flatMap((section) => [
      section.heading,
      section.body,
      ...(section.list ?? []),
      section.bodyAfter,
    ]),
  ]
    .filter(Boolean)
    .join('\n');
}

describe('legal content', () => {
  it('keeps privacy disclosures explicit in the authoritative English policy', () => {
    const text = flattenLegalText(privacyEn);

    expect(text).toContain('May 14, 2026');
    expect(text).toContain('data minimization');
    expect(text).toContain('No payment card data');
    expect(text).toContain('/api/me/data');
    expect(text).toContain('/api/data-retention');
    expect(text).toContain('deterministic fingerprints');
    expect(text).toContain('raw secrets');
    expect(text).toContain('provider-returned hotel price comparison data');
    expect(text).toContain('We do not use cookie data to invent');
  });

  it('keeps terms and Hebrew convenience translations aligned with source-of-truth warnings', () => {
    const termsText = flattenLegalText(termsEn);
    const hebrewText = `${flattenLegalText(privacyHe)}\n${flattenLegalText(termsHe)}`;

    expect(termsText).toContain('We do not process bookings directly');
    expect(termsText).toContain('provider-returned prices');
    expect(termsText).toContain('Always verify the final');
    expect(termsText).toContain('respective provider');
    expect(termsText).toContain('provided "as is"');
    expect(termsText).toContain('trademarks belong to their respective owners');
    expect(termsText).toContain('display it for comparison purposes');
    expect(hebrewText).toContain('תרגום זה מסופק לנוחותכם בלבד');
    expect(hebrewText).toContain('הנוסח המחייב הוא הנוסח באנגלית');
  });
});
