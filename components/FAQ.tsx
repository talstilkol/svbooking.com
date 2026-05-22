'use client';

import { useState } from 'react';
import { serializeJsonLd } from '@/lib/utils/jsonLd';
import { CATALOG_STATS } from '@/lib/catalog-stats';

const FAQS = [
  {
    q: 'How does SV Booking compare hotel prices?',
    a: 'We aggregate rates returned by configured pricing providers. Cache-backed heatmap observations are labeled as price-source observations, not booking providers. Missing or unverified prices are not displayed as confirmed booking offers.',
  },
  {
    q: 'Is SV Booking free to use?',
    a: 'SV Booking is free to browse and compare. Providers control final checkout prices, taxes, fees, and terms. No sign-up is required for public search and comparison flows.',
  },
  {
    q: 'What is the "Cheaper Dates" feature?',
    a: 'The Cheaper Dates tool checks available provider-returned date options around a selected stay. It reports savings only when provider data is available for both the original and alternative dates.',
  },
  {
    q: 'How many cities and hotels do you cover?',
    a: `The current static catalog contains ${CATALOG_STATS.hotels} hotels across ${CATALOG_STATS.cities} cities and ${CATALOG_STATS.countries} countries. Additional discovered hotels are kept separate until they are validated.`,
  },
  {
    q: 'What are AI Agents?',
    a: 'AI Agents scan configured providers, monitor provider health, and surface available recommendations from catalog, price, and locally saved preference signals. Unverified provider-quality scores are not displayed.',
  },
  {
    q: 'Do I book directly through SV Booking?',
    a: 'No, SV Booking is a price comparison service. Once you select an available provider result, checkout happens on that provider\'s site under that provider\'s terms and support policies.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-white border-t border-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-slate-500 mb-8">
          Everything you need to know about SV Booking
        </p>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-800">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    open === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
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
