'use client';

import { useLocale } from '@/components/LocaleProvider';

export default function Testimonials() {
  const { t } = useLocale();
  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
        {t('testimonialsHeading')}
      </h2>
      <p className="text-center text-slate-500 mb-10">
        {t('testimonialsUnavailable')}
      </p>
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-600">
        {t('testimonialsNoVerified')}
      </div>
    </section>
  );
}
