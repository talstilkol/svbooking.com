'use client';

import { useLocale } from '@/components/LocaleProvider';
import { SUPPORTED_LOCALES } from '@/lib/i18n';

export default function LocaleSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-lg border border-slate-200 overflow-hidden ${className}`}
    >
      {SUPPORTED_LOCALES.map((l) => {
        const active = locale === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            aria-pressed={active}
            lang={l.code}
            className={`px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-blue-50'
            }`}
          >
            {l.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
