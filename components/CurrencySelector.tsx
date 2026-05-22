'use client';

import { useLocalStorage } from '@/lib/useLocalStorage';
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from '@/lib/local-storage-keys';

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
];

export function useCurrency() {
  const [currency, setCurrency] = useLocalStorage<string>(
    LOCAL_STORAGE_KEYS.currency,
    'USD',
    [LEGACY_LOCAL_STORAGE_KEYS.currency]
  );
  return { currency, setCurrency };
}

export default function CurrencySelector({ className = '' }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      aria-label="Select currency"
      className={`text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer ${className}`}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
