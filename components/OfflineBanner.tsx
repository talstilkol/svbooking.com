'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

export default function OfflineBanner() {
  const { t } = useLocale();
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      setDismissed(false);
    };

    // Check initial state
    if (!navigator.onLine) queueMicrotask(() => setOffline(true));

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-amber-500 text-white px-4 py-2.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <div>
            <p className="text-sm font-semibold">{t('offlineTitle')}</p>
            <p className="text-xs opacity-90">{t('offlineBannerDescription')}</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white transition text-lg px-2"
          aria-label={t('offlineBannerDismiss')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
