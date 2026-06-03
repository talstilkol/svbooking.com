'use client';

import { useLocale } from '@/components/LocaleProvider';

export default function ProviderLogos({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  const coverageStates = [
    t('plConfiguredOnly'),
    t('plLinksReturned'),
    t('plMissingUnavailable'),
  ];

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label={t('plAriaCoverage')}
    >
      <span className="text-xs text-slate-500 font-medium me-1">{t('plRateSources')}</span>
      {coverageStates.map((label) => (
        <span
          key={label}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
