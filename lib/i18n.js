export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', dir: 'ltr', default: true },
  { code: 'he', name: 'עברית', dir: 'rtl', default: false },
];

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';

export const CORE_TRANSLATIONS = {
  en: {
    // Common
    searchHotels: 'Search hotels',
    comparePrices: 'Compare prices',
    providerReturnedPrices: 'Provider-returned prices',
    ratingUnavailable: 'Rating unavailable',
    providerSearchUnavailable: 'Provider search unavailable',
    priceUnavailable: 'Price unavailable',
    reviewsUnavailable: 'Reviews unavailable',
    amenitiesUnavailable: 'Verified amenity data is unavailable',
    sourceObservation: 'Source observation',
    noFakeData: 'Unavailable until verified data exists',
    // Navigation
    navSearch: 'Search',
    navCompare: 'Compare',
    navDeals: 'Deals',
    navExplore: 'Explore',
    navTrips: 'Trips',
    navFavorites: 'Favorites',
    navDashboard: 'Dashboard',
    navHome: 'SV Booking home',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    mainNavigation: 'Main navigation',
    // Auth
    signIn: 'Sign in',
    signOut: 'Sign out',
    account: 'Account',
    language: 'Language',
    // Hero
    heroBadge: 'AI-powered hotel price comparison',
    heroHeadline: 'Compare hotel rates in',
    heroSubtext: 'Compare provider-returned rates from configured partners when verified data is available.',
    popular: 'Popular:',
    // Footer
    footerTagline: 'Compare provider-returned hotel prices when configured sources respond. Missing rates stay unavailable.',
    footerSecure: 'Secure',
    footerFreeToUse: 'Free to use',
    footerNoSignup: 'No sign-up',
    footerExplore: 'Explore',
    footerTools: 'Tools',
    footerCompany: 'Company',
    footerPopularDestinations: 'Popular destinations',
    footerBrowseHotels: 'Browse Hotels',
    footerComparePrices: 'Compare Prices',
    footerSideBySide: 'Side-by-Side Compare',
    footerTodaysDeals: "Today's Deals",
    footerExploreDestinations: 'Explore Destinations',
    footerTripPlanner: 'Trip Planner',
    footerFavorites: 'Favorites',
    footerAboutUs: 'About Us',
    footerContact: 'Contact',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    footerHotelsIn: 'Hotels in',
    footerPricesWhenAvailable: 'Provider-returned prices when available',
    footerHotelsAcross: 'hotels across',
    footerCities: 'cities',
    footerPricingMeta: 'Pricing metadata from configured sources, including',
    footerNoSignupRequired: 'No sign-up required',
  },
  he: {
    // Common
    searchHotels: 'חיפוש מלונות',
    comparePrices: 'השוואת מחירים',
    providerReturnedPrices: 'מחירים שהוחזרו מספקים',
    ratingUnavailable: 'דירוג לא זמין',
    providerSearchUnavailable: 'חיפוש ספק לא זמין',
    priceUnavailable: 'מחיר לא זמין',
    reviewsUnavailable: 'ביקורות לא זמינות',
    amenitiesUnavailable: 'נתוני מתקנים מאומתים אינם זמינים',
    sourceObservation: 'תצפית מקור',
    noFakeData: 'לא זמין עד שיש נתונים מאומתים',
    // Navigation
    navSearch: 'חיפוש',
    navCompare: 'השוואה',
    navDeals: 'מבצעים',
    navExplore: 'גילוי יעדים',
    navTrips: 'טיולים',
    navFavorites: 'מועדפים',
    navDashboard: 'לוח בקרה',
    navHome: 'דף הבית של SV Booking',
    openMenu: 'פתח תפריט',
    closeMenu: 'סגור תפריט',
    mainNavigation: 'ניווט ראשי',
    // Auth
    signIn: 'התחברות',
    signOut: 'התנתקות',
    account: 'חשבון',
    language: 'שפה',
    // Hero
    heroBadge: 'השוואת מחירי מלונות מבוססת בינה מלאכותית',
    heroHeadline: 'השוואת מחירי מלונות ב־',
    heroSubtext: 'השוואת מחירים שהוחזרו מספקים מוגדרים כאשר קיימים נתונים מאומתים.',
    popular: 'פופולרי:',
    // Footer
    footerTagline: 'השוואת מחירי מלונות שהוחזרו מספקים כאשר מקורות מוגדרים מגיבים. מחירים חסרים נשארים לא זמינים.',
    footerSecure: 'מאובטח',
    footerFreeToUse: 'שימוש חינם',
    footerNoSignup: 'ללא הרשמה',
    footerExplore: 'גילוי',
    footerTools: 'כלים',
    footerCompany: 'החברה',
    footerPopularDestinations: 'יעדים פופולריים',
    footerBrowseHotels: 'עיון במלונות',
    footerComparePrices: 'השוואת מחירים',
    footerSideBySide: 'השוואה זה לצד זה',
    footerTodaysDeals: 'מבצעי היום',
    footerExploreDestinations: 'גילוי יעדים',
    footerTripPlanner: 'מתכנן הטיולים',
    footerFavorites: 'מועדפים',
    footerAboutUs: 'אודות',
    footerContact: 'צור קשר',
    footerPrivacy: 'מדיניות פרטיות',
    footerTerms: 'תנאי שימוש',
    footerHotelsIn: 'מלונות ב',
    footerPricesWhenAvailable: 'מחירים שהוחזרו מספקים כשזמינים',
    footerHotelsAcross: 'מלונות ב־',
    footerCities: 'ערים',
    footerPricingMeta: 'מטא-נתוני תמחור ממקורות מוגדרים, כולל',
    footerNoSignupRequired: 'אין צורך בהרשמה',
  },
};

function normalizeLocale(locale = DEFAULT_LOCALE) {
  return String(locale || DEFAULT_LOCALE).trim().toLowerCase().split(/[-_]/)[0];
}

export function getLocaleConfig(locale = DEFAULT_LOCALE) {
  const normalized = normalizeLocale(locale);
  return SUPPORTED_LOCALES.find((entry) => entry.code === normalized) || SUPPORTED_LOCALES[0];
}

export function resolveLocale({ locale, acceptLanguage } = {}) {
  if (locale) return getLocaleConfig(locale);
  const accepted = String(acceptLanguage || '')
    .split(',')
    .map((part) => part.trim().split(';')[0])
    .filter(Boolean);
  for (const candidate of accepted) {
    const config = getLocaleConfig(candidate);
    if (config.code !== DEFAULT_LOCALE || normalizeLocale(candidate) === DEFAULT_LOCALE) return config;
  }
  return getLocaleConfig(DEFAULT_LOCALE);
}

export function getTranslation(locale = DEFAULT_LOCALE, key) {
  const normalizedLocale = getLocaleConfig(locale).code;
  return CORE_TRANSLATIONS[normalizedLocale]?.[key] || CORE_TRANSLATIONS[DEFAULT_LOCALE][key] || key;
}

export function getDictionary(locale = DEFAULT_LOCALE) {
  const config = getLocaleConfig(locale);
  return {
    ...CORE_TRANSLATIONS[DEFAULT_LOCALE],
    ...(CORE_TRANSLATIONS[config.code] || {}),
  };
}

export function formatLocalizedDate(date, locale = DEFAULT_LOCALE, options = {}) {
  const parsed = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(getLocaleConfig(locale).code, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(parsed);
}

export function formatLocalizedCurrency(amount, locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return null;
  return new Intl.NumberFormat(getLocaleConfig(locale).code, {
    style: 'currency',
    currency: currency || DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(number);
}

export function buildLocalePayload({ locale, acceptLanguage, sampleDate, sampleAmount, currency = DEFAULT_CURRENCY } = {}) {
  const config = resolveLocale({ locale, acceptLanguage });
  return {
    locale: config.code,
    name: config.name,
    dir: config.dir,
    defaultLocale: DEFAULT_LOCALE,
    contentTranslation: config.code === DEFAULT_LOCALE ? 'complete' : 'partial',
    dictionary: getDictionary(config.code),
    formatting: {
      date: sampleDate ? formatLocalizedDate(sampleDate, config.code) : null,
      currency: sampleAmount !== undefined && sampleAmount !== null
        ? formatLocalizedCurrency(sampleAmount, config.code, currency)
        : null,
    },
    fallbackPolicy: 'missing-keys-fall-back-to-English-and-unavailable-states-remain-explicit',
  };
}

export function getI18nReadiness() {
  return {
    supportedLocales: SUPPORTED_LOCALES.map(({ code, name, dir }) => ({ code, name, dir })),
    defaultLocale: DEFAULT_LOCALE,
    rtlSupported: SUPPORTED_LOCALES.some((locale) => locale.dir === 'rtl'),
    status: 'infrastructure-ready',
    contentTranslation: 'partial',
    fallbackPolicy: 'missing-keys-fall-back-to-English-and-unavailable-states-remain-explicit',
    dictionaries: Object.fromEntries(
      Object.entries(CORE_TRANSLATIONS).map(([locale, values]) => [locale, Object.keys(values).length])
    ),
  };
}
