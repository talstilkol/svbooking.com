'use client';

import { useLocale } from '@/components/LocaleProvider';

export type LegalSection = {
  heading: string;
  /** Leading paragraph. Supports `code` and **strong** inline markers. */
  body?: string;
  /** Optional bulleted list. Each item supports the same inline markers. */
  list?: string[];
  /** Optional trailing paragraph rendered after the list. */
  bodyAfter?: string;
};

export type LegalContent = {
  title: string;
  lastUpdated: string;
  /** Shown only for non-authoritative translations (e.g. the Hebrew rendering). */
  disclaimer?: string;
  sections: LegalSection[];
};

/** Render a string with lightweight inline markers: `code` and **strong**. */
function renderRich(text: string, keyPrefix: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    return <span key={key}>{part}</span>;
  });
}

/**
 * Renders a legal document (privacy, terms) bilingually. The English version is
 * authoritative and server-rendered for SEO; Hebrew users see a convenience
 * translation prefaced with a disclaimer that the English version governs.
 */
export default function LegalDocument({ en, he }: { en: LegalContent; he: LegalContent }) {
  const { locale } = useLocale();
  const doc = locale === 'he' ? he : en;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{doc.title}</h1>
        <p className="text-sm text-slate-500 mb-8">{doc.lastUpdated}</p>

        {doc.disclaimer && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {doc.disclaimer}
          </div>
        )}

        <div className="prose prose-slate max-w-none space-y-8">
          {doc.sections.map((section, idx) => (
            <section key={`${section.heading}-${idx}`}>
              <h2 className="text-xl font-semibold text-slate-800">{section.heading}</h2>
              {section.body && (
                <p className="text-slate-600 leading-relaxed">{renderRich(section.body, `b${idx}`)}</p>
              )}
              {section.list && (
                <ul className="list-disc ps-6 text-slate-600 space-y-1 mt-2">
                  {section.list.map((item, li) => (
                    <li key={`${idx}-${li}`}>{renderRich(item, `l${idx}-${li}`)}</li>
                  ))}
                </ul>
              )}
              {section.bodyAfter && (
                <p className="text-slate-600 leading-relaxed mt-2">{renderRich(section.bodyAfter, `a${idx}`)}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
