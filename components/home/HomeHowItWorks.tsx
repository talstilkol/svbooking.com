'use client';

import { Search, BarChart3, Bot } from 'lucide-react';
import Reveal from '@/components/ui/Reveal';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useLocale } from '@/components/LocaleProvider';

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

const STEPS = [
  { icon: Search, titleKey: 'hwStep1Title', descKey: 'hwStep1Desc', color: 'from-blue-500 to-cyan-500' },
  { icon: BarChart3, titleKey: 'hwStep2Title', descKey: 'hwStep2Desc', color: 'from-purple-500 to-pink-500' },
  { icon: Bot, titleKey: 'hwStep3Title', descKey: 'hwStep3Desc', color: 'from-emerald-500 to-teal-500' },
];

export default function HomeHowItWorks() {
  const { t } = useLocale();
  return (
    <section className="max-w-7xl mx-auto px-4 py-20">
      <Reveal>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{t('hwHeading')}</h2>
          <p className="mt-3 text-slate-600">{t('hwSubtext')}</p>
        </div>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.titleKey} delay={i * 0.12}>
              <div className="group relative p-8 rounded-3xl bg-white border border-slate-200/60 hover:border-slate-300 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div
                  className={`w-14 h-14 rounded-2xl bg-linear-to-br ${s.color} flex items-center justify-center text-white mb-4 group-hover:rotate-6 transition-transform`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{t(s.titleKey)}</h3>
                <p className="mt-2 text-slate-600">{interpolate(t(s.descKey), { cities: CATALOG_STATS.cities })}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
