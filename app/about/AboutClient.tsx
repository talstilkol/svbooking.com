'use client';

import Link from 'next/link';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export default function AboutClient() {
  const { t } = useLocale();

  const stats = [
    { number: String(CATALOG_STATS.hotels), label: t('aboutHotels') },
    { number: String(CATALOG_STATS.cities), label: t('aboutCities') },
    { number: '8+', label: t('aboutProviders') },
    { number: String(CATALOG_STATS.countries), label: t('aboutCountries') },
  ];

  const values = [
    { icon: '🎯', title: t('aboutTransparency'), desc: t('aboutTransparencyDesc') },
    { icon: '⚡', title: t('aboutSpeed'), desc: t('aboutSpeedDesc') },
    { icon: '🔒', title: t('aboutPrivacy'), desc: t('aboutPrivacyDesc') },
    { icon: '💡', title: t('aboutInnovation'), desc: t('aboutInnovationDesc') },
  ];

  const steps = [
    { step: '1', title: t('aboutStep1Title'), desc: interpolate(t('aboutStep1Desc'), { hotels: CATALOG_STATS.hotels }) },
    { step: '2', title: t('aboutStep2Title'), desc: t('aboutStep2Desc') },
    { step: '3', title: t('aboutStep3Title'), desc: t('aboutStep3Desc') },
    { step: '4', title: t('aboutStep4Title'), desc: t('aboutStep4Desc') },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-linear-to-br from-blue-600 to-indigo-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('aboutTitle')}</h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">{t('aboutHeroSubtext')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-blue-600">{s.number}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('aboutMission')}</h2>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 leading-relaxed">{t('aboutMissionP1')}</p>
            <p className="text-slate-600 leading-relaxed mt-4">{t('aboutMissionP2')}</p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('aboutStandFor')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-xl border border-slate-200 p-6">
                <span className="text-3xl mb-3 block">{v.icon}</span>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{v.title}</h3>
                <p className="text-sm text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('aboutHowItWorks')}</h2>
          <div className="space-y-4">
            {steps.map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{s.title}</h3>
                  <p className="text-sm text-slate-600">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('aboutCtaTitle')}</h2>
          <p className="text-slate-600 mb-4">{t('aboutCtaSubtext')}</p>
          <div className="flex justify-center gap-3">
            <Link href="/search" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition">
              {t('aboutSearchHotels')}
            </Link>
            <Link href="/explore" className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium transition">
              {t('footerExploreDestinations')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
