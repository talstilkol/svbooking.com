'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import type { ProviderRate } from '@/lib/types';

type Rate = ProviderRate;

interface ComparisonSummaryProps {
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  rates: Rate[];
  cheapest: Rate | null;
  savingsPct: number;
}

export default function ComparisonSummary({
  hotelName,
  city,
  checkIn,
  checkOut,
  rates,
  cheapest,
  savingsPct,
}: ComparisonSummaryProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  if (!cheapest || rates.length === 0) return null;

  const nights = Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );
  const nightWord = nights === 1 ? t('summaryNight') : t('summaryNights');

  const summary = [
    `${hotelName} (${city})`,
    `${checkIn} ${t('summaryDateRangeTo')} ${checkOut} (${nights} ${nightWord})`,
    ``,
    `${t('summaryLowestReturnedPrice')}: ${cheapest.currency} ${cheapest.total.toFixed(2)} ${t('summaryOnProvider')} ${cheapest.provider}`,
    savingsPct > 0 ? t('summaryProviderDifference').replace('{pct}', String(savingsPct)) : '',
    ``,
    `${t('summaryAllPrices')}:`,
    ...rates.map((r, i) => `${i === 0 ? '  * ' : '    '}${r.provider}: ${r.currency} ${r.total.toFixed(2)}`),
    ``,
    t('summaryFoundOn'),
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`w-full mt-3 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
        copied
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
      }`}
    >
      {copied ? `✓ ${t('summaryCopied')}` : `📋 ${t('summaryCopyButton')}`}
    </button>
  );
}
