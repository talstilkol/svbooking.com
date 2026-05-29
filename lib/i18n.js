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
    // Trust badges
    trustSecure: 'Secure & Private',
    trustSecureDesc: 'No sign-up required',
    trustFree: 'Free To Browse',
    trustFreeDesc: 'No SV Booking fee',
    trustRates: 'Provider Rates',
    trustRatesDesc: 'When providers return data',
    trustCities: 'Cities',
    trustCatalogHotels: 'catalog hotels',
    // Newsletter
    nlHeading: 'Save local deal-alert preferences',
    nlSubtext: 'Store alert preferences locally until production email delivery is configured.',
    nlSubscribe: 'Subscribe',
    nlNoSpam: 'No spam. Unsubscribe anytime.',
    nlEmailAria: 'Email address for deal alerts',
    nlSubscribed: "You're subscribed!",
    nlSubscribedDesc: 'Your alert signup is saved locally. Email delivery remains unavailable until a production notification provider is configured.',
    // Why choose us
    whyHeading: 'Why travelers choose SV Booking',
    whySubtext: 'Tools for comparing hotels with available provider data',
    whyCompareTitle: 'Compare available providers',
    whyCompareDesc: 'One search shows provider-returned prices side by side when configured sources respond.',
    whyDatesTitle: 'Find cheaper dates',
    whyDatesDesc: 'The Cheaper Dates tool compares available provider prices across nearby dates and reports savings only when provider data supports it.',
    whyAgentsTitle: 'AI-powered agents',
    whyAgentsDesc: 'Automated deal scanners, health monitors, and personalized recommendations work in the background for you.',
    whyTrendsTitle: 'Price trend charts',
    whyTrendsDesc: 'See price-history charts when verified provider observations are available; otherwise the app marks history as unavailable.',
    whyNoSignupTitle: 'No sign-up required',
    whyNoSignupDesc: 'Start comparing prices instantly. Favorites and trips are saved locally in your browser unless account features are enabled.',
    whyCitiesWord: 'cities worldwide',
    whyCitiesDesc: 'From Paris to Tokyo, Dubai to New York — compare catalog hotels across the supported city list.',
    // FAQ
    faqHeading: 'Frequently Asked Questions',
    faqSubtext: 'Everything you need to know about SV Booking',
    faqQ1: 'How does SV Booking compare hotel prices?',
    faqA1: 'We aggregate rates returned by configured pricing providers. Cache-backed heatmap observations are labeled as price-source observations, not booking providers. Missing or unverified prices are not displayed as confirmed booking offers.',
    faqQ2: 'Is SV Booking free to use?',
    faqA2: 'SV Booking is free to browse and compare. Providers control final checkout prices, taxes, fees, and terms. No sign-up is required for public search and comparison flows.',
    faqQ3: 'What is the "Cheaper Dates" feature?',
    faqA3: 'The Cheaper Dates tool checks available provider-returned date options around a selected stay. It reports savings only when provider data is available for both the original and alternative dates.',
    faqQ4: 'How many cities and hotels do you cover?',
    faqA4: 'The current static catalog contains {hotels} hotels across {cities} cities and {countries} countries. Additional discovered hotels are kept separate until they are validated.',
    faqQ5: 'What are AI Agents?',
    faqA5: 'AI Agents scan configured providers, monitor provider health, and surface available recommendations from catalog, price, and locally saved preference signals. Unverified provider-quality scores are not displayed.',
    faqQ6: 'Do I book directly through SV Booking?',
    faqA6: "No, SV Booking is a price comparison service. Once you select an available provider result, checkout happens on that provider's site under that provider's terms and support policies.",
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
    // Trust badges
    trustSecure: 'מאובטח ופרטי',
    trustSecureDesc: 'אין צורך בהרשמה',
    trustFree: 'עיון חינם',
    trustFreeDesc: 'ללא עמלת SV Booking',
    trustRates: 'מחירי ספקים',
    trustRatesDesc: 'כאשר ספקים מחזירים נתונים',
    trustCities: 'ערים',
    trustCatalogHotels: 'מלונות בקטלוג',
    // Newsletter
    nlHeading: 'שמירת העדפות התראות מבצעים מקומית',
    nlSubtext: 'שמירת העדפות התראות מקומית עד שירות שליחת אימייל ייכנס לפעולה.',
    nlSubscribe: 'הרשמה',
    nlNoSpam: 'ללא ספאם. ניתן לבטל בכל עת.',
    nlEmailAria: 'כתובת אימייל להתראות מבצעים',
    nlSubscribed: 'נרשמת בהצלחה!',
    nlSubscribedDesc: 'הרשמת ההתראות נשמרה מקומית. שליחת אימייל אינה זמינה עד שספק התראות ייכנס לפעולה.',
    // Why choose us
    whyHeading: 'למה מטיילים בוחרים ב‑SV Booking',
    whySubtext: 'כלים להשוואת מלונות עם נתוני ספקים זמינים',
    whyCompareTitle: 'השוואת ספקים זמינים',
    whyCompareDesc: 'חיפוש אחד מציג מחירים שהוחזרו מספקים זה לצד זה כאשר מקורות מוגדרים מגיבים.',
    whyDatesTitle: 'מציאת תאריכים זולים יותר',
    whyDatesDesc: 'כלי "תאריכים זולים יותר" משווה מחירי ספקים זמינים בתאריכים סמוכים ומדווח על חיסכון רק כאשר נתוני הספק תומכים בכך.',
    whyAgentsTitle: 'סוכנים מבוססי בינה מלאכותית',
    whyAgentsDesc: 'סורקי מבצעים אוטומטיים, ניטור תקינות והמלצות מותאמות אישית פועלים עבורכם ברקע.',
    whyTrendsTitle: 'גרפים של מגמות מחירים',
    whyTrendsDesc: 'הצגת גרפי היסטוריית מחירים כאשר קיימות תצפיות ספק מאומתות; אחרת ההיסטוריה מסומנת כלא זמינה.',
    whyNoSignupTitle: 'ללא צורך בהרשמה',
    whyNoSignupDesc: 'התחילו להשוות מחירים מיד. מועדפים וטיולים נשמרים מקומית בדפדפן אלא אם תכונות חשבון מופעלות.',
    whyCitiesWord: 'ערים ברחבי העולם',
    whyCitiesDesc: 'מפריז לטוקיו, מדובאי לניו יורק — השוו מלונות מהקטלוג ברשימת הערים הנתמכות.',
    // FAQ
    faqHeading: 'שאלות נפוצות',
    faqSubtext: 'כל מה שצריך לדעת על SV Booking',
    faqQ1: 'כיצד SV Booking משווה מחירי מלונות?',
    faqA1: 'אנו מאגדים מחירים שהוחזרו מספקי תמחור מוגדרים. תצפיות מפת חום מהמטמון מסומנות כתצפיות מקור-מחיר, ולא כספקי הזמנה. מחירים חסרים או לא מאומתים אינם מוצגים כהצעות הזמנה מאושרות.',
    faqQ2: 'האם השימוש ב‑SV Booking חינמי?',
    faqA2: 'השימוש ב‑SV Booking לעיון והשוואה חינמי. הספקים שולטים במחירי הסיום, מסים, עמלות ותנאים. אין צורך בהרשמה לחיפוש והשוואה ציבוריים.',
    faqQ3: 'מהי תכונת "תאריכים זולים יותר"?',
    faqA3: 'כלי "תאריכים זולים יותר" בודק אפשרויות תאריך שהוחזרו מספקים סביב שהות נבחרת. הוא מדווח על חיסכון רק כאשר נתוני ספק זמינים גם לתאריך המקורי וגם לחלופי.',
    faqQ4: 'בכמה ערים ומלונות אתם מכסים?',
    faqA4: 'הקטלוג הסטטי הנוכחי כולל {hotels} מלונות ב‑{cities} ערים ו‑{countries} מדינות. מלונות נוספים שהתגלו נשמרים בנפרד עד לאימותם.',
    faqQ5: 'מהם סוכני ה‑AI?',
    faqA5: 'סוכני ה‑AI סורקים ספקים מוגדרים, מנטרים את תקינות הספקים, ומציגים המלצות זמינות מתוך אותות קטלוג, מחיר והעדפות שנשמרו מקומית. ציוני איכות ספק לא מאומתים אינם מוצגים.',
    faqQ6: 'האם אני מזמין ישירות דרך SV Booking?',
    faqA6: 'לא, SV Booking הוא שירות השוואת מחירים. לאחר בחירת תוצאת ספק זמינה, ההזמנה מתבצעת באתר הספק תחת התנאים ומדיניות התמיכה שלו.',
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
