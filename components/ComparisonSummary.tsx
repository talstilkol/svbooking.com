'use client';

import { useState } from 'react';

interface Rate {
  provider: string;
  total: number;
  currency: string;
}

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
  const [copied, setCopied] = useState(false);

  if (!cheapest || rates.length === 0) return null;

  const nights = Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  const summary = [
    `${hotelName} (${city})`,
    `${checkIn} to ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})`,
    ``,
    `Best price: ${cheapest.currency} ${cheapest.total.toFixed(2)} on ${cheapest.provider}`,
    savingsPct > 0 ? `Save ${savingsPct}% vs most expensive option` : '',
    ``,
    `All prices:`,
    ...rates.map((r, i) => `${i === 0 ? '  * ' : '    '}${r.provider}: ${r.currency} ${r.total.toFixed(2)}`),
    ``,
    `Found on SV Booking — svbooking.com`,
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
      {copied ? '✓ Summary copied to clipboard!' : '📋 Copy price summary'}
    </button>
  );
}
