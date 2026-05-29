'use client';

import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useLocale } from '@/components/LocaleProvider';

export default function WhyChooseUs() {
  const { t } = useLocale();

  const reasons = [
    { icon: '🔎', title: t('whyCompareTitle'), desc: t('whyCompareDesc'), color: 'bg-blue-50 border-blue-100' },
    { icon: '📅', title: t('whyDatesTitle'), desc: t('whyDatesDesc'), color: 'bg-emerald-50 border-emerald-100' },
    { icon: '🤖', title: t('whyAgentsTitle'), desc: t('whyAgentsDesc'), color: 'bg-purple-50 border-purple-100' },
    { icon: '📊', title: t('whyTrendsTitle'), desc: t('whyTrendsDesc'), color: 'bg-amber-50 border-amber-100' },
    { icon: '🔒', title: t('whyNoSignupTitle'), desc: t('whyNoSignupDesc'), color: 'bg-slate-50 border-slate-100' },
    {
      icon: '🌍',
      title: `${CATALOG_STATS.cities} ${t('whyCitiesWord')}`,
      desc: t('whyCitiesDesc'),
      color: 'bg-sky-50 border-sky-100',
    },
  ];

  return (
    <section className="bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">{t('whyHeading')}</h2>
        <p className="text-center text-slate-500 mb-10 max-w-2xl mx-auto">{t('whySubtext')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className={`p-6 rounded-xl border ${reason.color} transition-shadow hover:shadow-md`}
            >
              <div className="text-3xl mb-3" aria-hidden="true">{reason.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-2">{reason.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{reason.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
