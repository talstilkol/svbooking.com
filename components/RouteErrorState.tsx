'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

interface RouteErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  secondaryHref: string;
  secondaryLabelKey: string;
  consoleLabel: string;
}

export default function RouteErrorState({
  error,
  reset,
  icon,
  titleKey,
  descriptionKey,
  secondaryHref,
  secondaryLabelKey,
  consoleLabel,
}: RouteErrorStateProps) {
  const { t } = useLocale();

  useEffect(() => {
    console.error(`${consoleLabel}:`, error);
  }, [consoleLabel, error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-6 opacity-80">{icon}</div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">{t(titleKey)}</h2>
        <p className="text-slate-600 mb-2">{t(descriptionKey)}</p>
        {error.digest && (
          <p className="text-xs text-slate-500 mb-6 font-mono">
            {t('routeErrorId')}: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            {t('routeErrorTryAgain')}
          </button>
          <Link
            href={secondaryHref}
            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all font-medium"
          >
            {t(secondaryLabelKey)}
          </Link>
        </div>
      </div>
    </div>
  );
}
