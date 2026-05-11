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
  const currencyCode = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).resolvedOptions().currency || 'USD';

  // Check if detected currency is supported
  if (CURRENCIES.some((c) => c.code === currencyCode)) {
    return currencyCode;
  }

  // Fallback to common currencies based on locale
  if (locale.startsWith('en-GB') || locale.startsWith('gb')) return 'GBP';
  if (locale.startsWith('en-AU') || locale.startsWith('au')) return 'AUD';
  if (locale.startsWith('en-CA') || locale.startsWith('ca')) return 'CAD';
  if (locale.startsWith('ja')) return 'JPY';
  if (locale.startsWith('zh')) return 'CNY';
  if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('it')) return 'EUR';
  if (locale.startsWith('he')) return 'ILS';
  if (locale.startsWith('ar')) return 'AED';
  if (locale.startsWith('th')) return 'THB';
  if (locale.startsWith('hi') || locale.startsWith('en-IN')) return 'INR';

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
