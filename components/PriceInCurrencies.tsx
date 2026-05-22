'use client';

import { useState, useEffect } from 'react';

interface PriceInCurrenciesProps {
  amount: number;
  baseCurrency: string;
  className?: string;
}

const DISPLAY_CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'ILS', symbol: '₪', label: 'Israeli Shekel' },
  { code: 'THB', symbol: '฿', label: 'Thai Baht' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
];

/**
 * Shows the hotel price converted to popular currencies using exchange-rate API data.
 * Uses the free /api/exchange-rates endpoint (no auth required).
 * Displayed inline on hotel detail pages below the price comparison.
 */
export default function PriceInCurrencies({ amount, baseCurrency, className = '' }: PriceInCurrenciesProps) {
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!amount || !baseCurrency) return;
    let cancelled = false;

    fetch(`/api/exchange-rates?base=${baseCurrency}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.rates) {
          setRates(data.rates);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [baseCurrency, amount]);

  if (!rates) return null;

  const conversions = DISPLAY_CURRENCIES
    .filter((c) => c.code !== baseCurrency && rates[c.code])
    .map((c) => ({
      ...c,
      converted: Math.round(amount * rates[c.code]),
    }));

  if (conversions.length === 0) return null;

  return (
    <div className={`rounded-lg border border-blue-100 bg-blue-50/50 p-3 ${className}`}>
      <p className="text-xs font-medium text-blue-800 mb-2">
        Price in other currencies
      </p>
      <div className="flex flex-wrap gap-2">
        {conversions.map((c) => (
          <span
            key={c.code}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs text-zinc-700 border border-blue-100"
            title={c.label}
          >
            <span className="font-medium">{c.symbol}{c.converted.toLocaleString()}</span>
            <span className="text-zinc-400">{c.code}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
