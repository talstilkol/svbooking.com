'use client';

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function ContactClient() {
  const { t } = useLocale();

  const methods = [
    { icon: '📧', title: t('contactEmailTitle'), desc: t('contactEmailDesc'), value: 'hello@svbooking.com', href: 'mailto:hello@svbooking.com' },
    { icon: '🐛', title: t('contactBugTitle'), desc: t('contactBugDesc'), value: t('contactBugValue'), href: 'https://github.com/talstilkol/svbooking.com/issues' },
    { icon: '💼', title: t('contactPartnerTitle'), desc: t('contactPartnerDesc'), value: 'partners@svbooking.com', href: 'mailto:partners@svbooking.com' },
  ];

  const faqs = [
    { q: t('contactQ1'), a: t('contactA1') },
    { q: t('contactQ2'), a: t('contactA2') },
    { q: t('contactQ3'), a: t('contactA3') },
    { q: t('contactQ4'), a: t('contactA4') },
  ];

  return (
    <div className="min-h-screen">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-sky-500 via-blue-500 to-indigo-500 text-white py-10 px-4 mb-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-3 inline-block transition-colors">&larr; {t('compareHome')}</Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('contactTitle')}</h1>
          <p className="text-white/70">{t('contactSubtext')}</p>
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Contact methods */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {methods.map((m) => (
              <a
                key={m.title}
                href={m.href}
                target={m.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={m.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                className="bg-white rounded-xl border border-slate-200 p-6 text-center hover:border-blue-300 hover:shadow-md transition-all"
              >
                <span className="text-3xl block mb-3">{m.icon}</span>
                <h3 className="font-semibold text-slate-800 mb-1">{m.title}</h3>
                <p className="text-xs text-slate-500 mb-2">{m.desc}</p>
                <span className="text-sm text-blue-600 font-medium">{m.value}</span>
              </a>
            ))}
          </div>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">{t('faqHeading')}</h2>
            <div className="space-y-4">
              {faqs.map((item) => (
                <div key={item.q} className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-1">{item.q}</h3>
                  <p className="text-sm text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{t('contactCtaTitle')}</h2>
            <p className="text-slate-500 mb-4">{t('contactCtaSubtext')}</p>
            <Link href="/search" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition">
              {t('contactStartComparing')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
