'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'How does SV Booking compare hotel prices?',
    a: 'We aggregate prices from 8+ online travel agencies including Booking.com, Expedia, Hotels.com, Agoda, and more. Our system fetches real-time rates so you can see all options side-by-side and pick the cheapest one.',
  },
  {
    q: 'Is SV Booking free to use?',
    a: 'Yes, completely free! We compare hotel prices across major providers at no cost. No sign-up required. You book directly with the provider offering the best price.',
  },
  {
    q: 'What is the "Cheaper Dates" feature?',
    a: 'Our Cheaper Dates tool analyzes hotel price trends and suggests alternative check-in dates within 3 days, 1 week, or 1 month of your selected dates. Many travelers save 20-40% just by shifting their dates slightly.',
  },
  {
    q: 'How many cities and hotels do you cover?',
    a: 'We currently cover 130+ hotels across 45+ cities in over 20 countries worldwide, including popular destinations like Paris, London, Tokyo, Dubai, New York, Bangkok, and many more. Our catalog grows daily through automated discovery.',
  },
  {
    q: 'What are AI Agents?',
    a: 'Our AI Agents automatically scan for deals, monitor price drops, and provide personalized hotel recommendations based on your browsing history and saved favorites. They work in the background to find you the best deals.',
  },
  {
    q: 'Do I book directly through SV Booking?',
    a: 'No, we are a price comparison service. Once you find the best price, you book directly with the provider (Booking.com, Expedia, etc.). This ensures you get the provider\'s own customer support and guarantees.',
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
            __html: JSON.stringify({
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
