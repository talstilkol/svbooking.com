export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.24,
  HKD: 7.82,
  SGD: 1.34,
  ILS: 3.65,
  AED: 3.67,
  THB: 35.50,
  INR: 83.12,
};

export function detectCurrency(): string {
  if (typeof window === 'undefined') return 'USD';

  const locale = navigator.language || 'en-US';

  // Map locale regions to currencies (Intl.NumberFormat with currency:'USD' always returns USD — useless)
  const LOCALE_CURRENCY: Record<string, string> = {
    'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD', 'en-IN': 'INR',
    'en-SG': 'SGD', 'en-HK': 'HKD', 'en-IL': 'ILS', 'en-AE': 'AED',
    'ja': 'JPY', 'zh': 'CNY', 'zh-HK': 'HKD', 'zh-TW': 'CNY',
    'de': 'EUR', 'fr': 'EUR', 'it': 'EUR', 'es': 'EUR', 'nl': 'EUR',
    'pt': 'EUR', 'fi': 'EUR', 'el': 'EUR', 'de-CH': 'CHF', 'fr-CH': 'CHF',
    'he': 'ILS', 'ar': 'AED', 'ar-SA': 'AED',
    'th': 'THB', 'hi': 'INR', 'ko': 'USD',
  };

  // Try exact match first, then language prefix
  const detected = LOCALE_CURRENCY[locale] || LOCALE_CURRENCY[locale.split('-')[0]];
  if (detected && CURRENCIES.some((c) => c.code === detected)) {
    return detected;
  }

  return 'USD';
}

export function getCurrencyCode(): string {
  if (typeof window === 'undefined') return 'USD';
  
  const stored = localStorage.getItem('svbooking-currency');
  if (stored && CURRENCIES.some(c => c.code === stored)) {
    return stored;
  }
  
  const detected = detectCurrency();
  localStorage.setItem('svbooking-currency', detected);
  return detected;
}

export function setCurrencyCode(code: string): void {
  if (typeof window === 'undefined') return;
  
  if (CURRENCIES.some(c => c.code === code)) {
    localStorage.setItem('svbooking-currency', code);
  }
}

export function formatPrice(amount: number, currencyCode?: string): string {
  const code = currencyCode || getCurrencyCode();

  // Convert from USD to target currency
  const rate = EXCHANGE_RATES[code] || 1;
  const converted = amount * rate;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(converted);
}

export function convertPrice(amount: number, toCurrency: string): number {
  const rate = EXCHANGE_RATES[toCurrency] || 1;
  return amount * rate;
}
