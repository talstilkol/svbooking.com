'use client';

import { useLocale } from '@/components/LocaleProvider';

export default function HomeExploreHeading() {
  const { t } = useLocale();
  return (
    <>
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
        {t('homeExploreHeading')}
      </h2>
      <p className="text-center text-slate-500 mb-8">
        {t('homeExploreSubtext')}
      </p>
    </>
  );
}
