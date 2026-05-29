'use client';

import { useState } from 'react';
import { serializeJsonLd } from '@/lib/utils/jsonLd';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export default function FAQ() {
  const { t } = useLocale();
  const [open, setOpen] = useState<number | null>(null);

  const FAQS = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    {
      q: t('faqQ4'),
      a: interpolate(t('faqA4'), {
        hotels: CATALOG_STATS.hotels,
        cities: CATALOG_STATS.cities,
        countries: CATALOG_STATS.countries,
      }),
    },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
  ];

  return (
    <section className="bg-white border-t border-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          {t('faqHeading')}
        </h2>
        <p className="text-center text-slate-500 mb-8">
          {t('faqSubtext')}
        </p>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                aria-controls={`faq-answer-${i}`}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-800">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-200 ${
                    open === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="px-5 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FAQ Schema for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQS.map((faq) => ({
                '@type': 'Question',
                name: faq.q,
                acceptedAnswer: { '@type': 'Answer', text: faq.a },
              })),
            }),
          }}
        />
      </div>
    </section>
  );
}
