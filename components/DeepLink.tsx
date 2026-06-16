'use client';

import { useState, useMemo } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface DeepLinkProps {
  hotelKey: string;
  hotelName: string;
  checkIn?: string;
  checkOut?: string;
  className?: string;
}

export default function DeepLink({
  hotelKey,
  hotelName,
  checkIn,
  checkOut,
  className = '',
}: DeepLinkProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const urls = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    const queryStr = params.toString() ? `?${params}` : '';

    return {
      hotelPage: `${base}/hotel/${hotelKey}${queryStr}`,
      compare: `${base}/compare?hotelKey=${hotelKey}${checkIn ? `&checkIn=${checkIn}` : ''}${checkOut ? `&checkOut=${checkOut}` : ''}`,
      search: `${base}/search?city=${encodeURIComponent(hotelName.split(' ').pop() || '')}`,
    };
  }, [hotelKey, hotelName, checkIn, checkOut]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={className}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
      >
        🔗 {t('deepLinkGetLink')}
      </button>

      {showPanel && (
        <div className="mt-2 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase">{t('deepLinkHeading')}</h4>

          {[
            { label: t('deepLinkHotelPage'), url: urls.hotelPage },
            { label: t('deepLinkFullComparison'), url: urls.compare },
          ].map((link) => (
            <div key={link.label} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24 shrink-0">{link.label}:</span>
              <input
                type="text"
                readOnly
                value={link.url}
                className="flex-1 text-xs bg-slate-50 rounded px-2 py-1.5 text-slate-600 outline-none truncate"
              />
              <button
                onClick={() => copyUrl(link.url)}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition shrink-0"
              >
                {copied ? '✓' : t('shareCopy')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
