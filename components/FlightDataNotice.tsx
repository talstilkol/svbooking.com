'use client';

import { useLocale } from '@/components/LocaleProvider';

interface FlightDataNoticeProps {
  city: string;
  className?: string;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => String(vars[key] ?? `{${key}}`));
}

export default function FlightDataNotice({ city, className = '' }: FlightDataNoticeProps) {
  const { t } = useLocale();

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-1">
        {interpolate(t('flightDataTitle'), { city })}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed">
        {t('flightDataUnavailable')}
      </p>
    </div>
  );
}
