import type { LegalContent } from '@/components/LegalDocument';

// Hebrew convenience-translation disclaimer. The English text is authoritative.
const HE_DISCLAIMER =
  'תרגום זה מסופק לנוחותכם בלבד. בכל מקרה של סתירה, הנוסח המחייב הוא הנוסח באנגלית.';

export const privacyEn: LegalContent = {
  title: 'Privacy Policy',
  lastUpdated: 'Last updated: May 14, 2026',
  sections: [
    {
      heading: '1. Overview',
      body: 'SV Booking ("we", "our", "us") is built around data minimization: we only show verified travel data when a source exists, and we mark unavailable fields as unavailable instead of generating personal, review, or pricing claims. This policy explains what data is stored, how it is used, and your controls.',
    },
    {
      heading: '2. Data We Collect',
      body: '**We collect minimal data.** Most browsing and saved travel planning can work on your local device. If you sign in, account-scoped records can also be stored so they can sync across devices.',
      list: [
        'Hotel searches and comparisons needed to return provider prices and availability states.',
        'Favorites, trips, preferences, and price alerts stored locally and, when signed in, in account-scoped storage.',
        'Provider click and price mismatch records used to measure price accuracy.',
        'Operational logs use redacted details or deterministic fingerprints; raw secrets are not stored in these records.',
        'No payment card data is collected or processed by SV Booking.',
      ],
    },
    {
      heading: '3. Local and Account Storage',
      body: 'Local favorites, saved trips, recent searches, and price-alert drafts may be stored in browser storage. Signed-in users can also store favorites, trips, preferences, and price alerts through authenticated no-store APIs. You can export or clear this app-owned account data from the profile data controls, which call `/api/me/data`. Clearing your browser data removes local-device records; using the account delete control removes app-owned server records and related fingerprinted alert events.',
    },
    {
      heading: '4. Third-Party Services',
      body: 'We can use third-party services to authenticate users, host the app, fetch provider prices, and enrich travel context when configured:',
      list: [
        'Kinde — authentication when sign-in is enabled.',
        'Upstash Redis or compatible KV — durable account, alert, cache, and operations storage when configured.',
        'Hotel pricing providers such as Xotelo or configured partner providers — provider-returned hotel price comparison data.',
        'Vercel or equivalent hosting infrastructure — application hosting.',
      ],
      bodyAfter:
        "When you click through to book on a provider's website (Booking.com, Expedia, etc.), their privacy policies apply.",
    },
    {
      heading: '5. Cookies',
      body: 'Authentication cookies are used when you sign in. Local device features use browser storage. We do not use cookie data to invent or infer hotel reviews, prices, savings, or availability.',
    },
    {
      heading: '6. Your Rights',
      body: 'You can export app-owned local and signed-in account data from the profile data controls. You can also clear local records and delete app-owned account records there. The account-data deletion flow removes favorites, trips, preferences, price alerts, the price-alert user index entry, and fingerprinted price-alert events held by SV Booking. Closing the external authentication account may require the auth-provider account lifecycle or a support request.',
    },
    {
      heading: '7. Retention',
      body: 'The public `/api/data-retention` endpoint lists current operational retention windows. Examples include 30 days for price-alert trigger events, 90 days for price accuracy and admin audit events, and shorter TTLs for provider trends and rate caches. User-owned records persist until user action or account-retention rules apply.',
    },
    {
      heading: '8. Contact',
      body: 'For privacy-related questions, please reach out via our contact page.',
    },
  ],
};

export const privacyHe: LegalContent = {
  title: 'מדיניות פרטיות',
  lastUpdated: 'עודכן לאחרונה: 14 במאי 2026',
  disclaimer: HE_DISCLAIMER,
  sections: [
    {
      heading: '1. סקירה כללית',
      body: 'SV Booking ("אנחנו", "שלנו") בנויה סביב עקרון מזעור הנתונים: אנו מציגים נתוני נסיעות מאומתים רק כאשר קיים מקור, ומסמנים שדות שאינם זמינים ככאלה במקום לייצר נתונים אישיים, ביקורות או מחירים מומצאים. מדיניות זו מסבירה אילו נתונים נשמרים, כיצד נעשה בהם שימוש, ואילו אמצעי שליטה עומדים לרשותכם.',
    },
    {
      heading: '2. הנתונים שאנו אוספים',
      body: '**אנו אוספים מינימום נתונים.** רוב הגלישה ותכנון הנסיעות השמור יכולים לפעול על המכשיר המקומי שלכם. אם תתחברו לחשבון, ניתן לשמור גם רשומות ברמת החשבון כדי לסנכרן אותן בין מכשירים.',
      list: [
        'חיפושי מלונות והשוואות הדרושים להחזרת מחירי ספקים ומצבי זמינות.',
        'מועדפים, טיולים, העדפות והתראות מחיר הנשמרים מקומית, ובעת התחברות — באחסון ברמת החשבון.',
        'רשומות קליקים על ספקים ופערי מחירים המשמשות למדידת דיוק המחירים.',
        'יומני תפעול משתמשים בפרטים מצונזרים או בטביעות אצבע דטרמיניסטיות; סודות גולמיים אינם נשמרים ברשומות אלה.',
        'SV Booking אינה אוספת או מעבדת נתוני כרטיסי אשראי.',
      ],
    },
    {
      heading: '3. אחסון מקומי ובחשבון',
      body: 'מועדפים מקומיים, טיולים שמורים, חיפושים אחרונים וטיוטות התראות מחיר עשויים להישמר באחסון הדפדפן. משתמשים מחוברים יכולים גם לשמור מועדפים, טיולים, העדפות והתראות מחיר באמצעות ממשקי API מאומתים מסוג no-store. תוכלו לייצא או למחוק נתוני חשבון אלה שבבעלות האפליקציה מתוך אמצעי השליטה בנתונים בפרופיל, הקוראים ל-`/api/me/data`. מחיקת נתוני הדפדפן מסירה רשומות מהמכשיר המקומי; שימוש בפקד מחיקת החשבון מסיר רשומות שרת שבבעלות האפליקציה ואירועי התראה המזוהים בטביעת אצבע הקשורים אליהן.',
    },
    {
      heading: '4. שירותי צד שלישי',
      body: 'אנו עשויים להשתמש בשירותי צד שלישי כדי לאמת משתמשים, לארח את האפליקציה, לאחזר מחירי ספקים ולהעשיר את הקשר הנסיעה כאשר הם מוגדרים:',
      list: [
        'Kinde — אימות משתמשים כאשר ההתחברות מופעלת.',
        'Upstash Redis או KV תואם — אחסון עמיד לחשבון, להתראות, למטמון ולתפעול כאשר מוגדר.',
        'ספקי תמחור מלונות כגון Xotelo או ספקים שותפים מוגדרים — נתוני השוואת מחירי מלונות שהוחזרו מהספקים.',
        'Vercel או תשתית אירוח שוות ערך — אירוח האפליקציה.',
      ],
      bodyAfter:
        'כאשר אתם עוברים להזמנה באתר של ספק (Booking.com, Expedia וכדומה), חלה מדיניות הפרטיות שלהם.',
    },
    {
      heading: '5. עוגיות (Cookies)',
      body: 'עוגיות אימות משמשות כאשר אתם מתחברים. תכונות המכשיר המקומי משתמשות באחסון הדפדפן. איננו משתמשים בנתוני עוגיות כדי להמציא או להסיק ביקורות, מחירים, חיסכון או זמינות של מלונות.',
    },
    {
      heading: '6. הזכויות שלכם',
      body: 'תוכלו לייצא נתונים מקומיים ונתוני חשבון מחובר שבבעלות האפליקציה מתוך אמצעי השליטה בנתונים בפרופיל. שם תוכלו גם לנקות רשומות מקומיות ולמחוק רשומות חשבון שבבעלות האפליקציה. תהליך מחיקת נתוני החשבון מסיר מועדפים, טיולים, העדפות, התראות מחיר, את רשומת אינדקס המשתמש להתראות מחיר, ואירועי התראות מחיר המזוהים בטביעת אצבע המוחזקים על ידי SV Booking. סגירת חשבון האימות החיצוני עשויה לדרוש את מחזור החיים של חשבון ספק האימות או פנייה לתמיכה.',
    },
    {
      heading: '7. שמירת נתונים',
      body: 'נקודת הקצה הציבורית `/api/data-retention` מפרטת את חלונות שמירת הנתונים התפעוליים הנוכחיים. דוגמאות כוללות 30 ימים לאירועי הפעלת התראות מחיר, 90 ימים לאירועי דיוק מחירים וביקורת ניהולית, ו-TTL קצרים יותר למגמות ספקים ולמטמוני תעריפים. רשומות שבבעלות המשתמש נשמרות עד לפעולת המשתמש או עד שחלים כללי שמירת החשבון.',
    },
    {
      heading: '8. יצירת קשר',
      body: 'לשאלות הקשורות לפרטיות, אנא פנו אלינו דרך עמוד יצירת הקשר.',
    },
  ],
};

export const termsEn: LegalContent = {
  title: 'Terms of Service',
  lastUpdated: 'Last updated: May 11, 2026',
  sections: [
    {
      heading: '1. Acceptance',
      body: "By using SV Booking, you agree to these terms. If you don't agree, please don't use our service.",
    },
    {
      heading: '2. Service Description',
      body: "SV Booking is a free hotel price comparison tool. We aggregate pricing data from multiple booking providers and display it for comparison purposes. We do not process bookings directly — all bookings are completed on the respective provider's website.",
    },
    {
      heading: '3. Price Accuracy',
      body: "While we strive to show current provider-returned prices, we cannot guarantee that displayed prices are always current. Prices may change between the time we fetch them and when you visit the provider's site. Always verify the final price on the booking provider's website before completing your reservation.",
    },
    {
      heading: '4. No Warranty',
      body: 'SV Booking is provided "as is" without warranties of any kind. We are not responsible for booking errors, price discrepancies, or issues with third-party booking providers.',
    },
    {
      heading: '5. User Conduct',
      body: 'You agree not to:',
      list: [
        'Scrape, crawl, or otherwise extract data from our service programmatically',
        'Attempt to overload our servers or the APIs we rely on',
        'Use the service for any illegal purpose',
        'Misrepresent yourself or your intent when using the service',
      ],
    },
    {
      heading: '6. Intellectual Property',
      body: 'All content, design, and code on SV Booking is our intellectual property. Hotel names, logos, and trademarks belong to their respective owners. Provider names and branding belong to their respective companies.',
    },
    {
      heading: '7. Limitation of Liability',
      body: 'SV Booking shall not be liable for any indirect, incidental, or consequential damages arising from use of the service. Our total liability is limited to zero, as this is a free service.',
    },
    {
      heading: '8. Changes',
      body: 'We may update these terms at any time. Continued use after changes constitutes acceptance of the updated terms.',
    },
  ],
};

export const termsHe: LegalContent = {
  title: 'תנאי שימוש',
  lastUpdated: 'עודכן לאחרונה: 11 במאי 2026',
  disclaimer: HE_DISCLAIMER,
  sections: [
    {
      heading: '1. הסכמה',
      body: 'בעצם השימוש ב-SV Booking, אתם מסכימים לתנאים אלה. אם אינכם מסכימים, אנא הימנעו משימוש בשירות שלנו.',
    },
    {
      heading: '2. תיאור השירות',
      body: 'SV Booking הוא כלי חינמי להשוואת מחירי מלונות. אנו מרכזים נתוני תמחור ממספר ספקי הזמנות ומציגים אותם לצורכי השוואה. איננו מבצעים הזמנות באופן ישיר — כל ההזמנות מושלמות באתר של הספק הרלוונטי.',
    },
    {
      heading: '3. דיוק המחירים',
      body: 'אף שאנו שואפים להציג מחירים עדכניים שהוחזרו מהספקים, איננו יכולים להבטיח שהמחירים המוצגים תמיד עדכניים. המחירים עשויים להשתנות בין מועד האחזור שלהם לבין מועד הביקור שלכם באתר הספק. תמיד אמתו את המחיר הסופי באתר של ספק ההזמנות לפני השלמת ההזמנה.',
    },
    {
      heading: '4. ללא אחריות',
      body: 'SV Booking מסופק "כמות שהוא" (as is) ללא אחריות מכל סוג. איננו אחראים לטעויות בהזמנה, לפערי מחירים או לבעיות מול ספקי הזמנות צד שלישי.',
    },
    {
      heading: '5. התנהגות המשתמש',
      body: 'אתם מסכימים שלא:',
      list: [
        'לבצע גרידה (scrape), זחילה (crawl) או חילוץ נתונים אחר מהשירות שלנו באופן אוטומטי',
        'לנסות להעמיס על השרתים שלנו או על ממשקי ה-API שעליהם אנו מסתמכים',
        'להשתמש בשירות לכל מטרה בלתי חוקית',
        'להציג מצג שווא לגבי זהותכם או כוונותיכם בעת השימוש בשירות',
      ],
    },
    {
      heading: '6. קניין רוחני',
      body: 'כל התוכן, העיצוב והקוד ב-SV Booking הם קניין רוחני שלנו. שמות מלונות, לוגואים וסימני מסחר שייכים לבעליהם בהתאמה. שמות הספקים והמיתוג שלהם שייכים לחברות הרלוונטיות.',
    },
    {
      heading: '7. הגבלת אחריות',
      body: 'SV Booking לא תישא באחריות לכל נזק עקיף, מקרי או תוצאתי הנובע מהשימוש בשירות. סך האחריות שלנו מוגבל לאפס, מאחר שמדובר בשירות חינמי.',
    },
    {
      heading: '8. שינויים',
      body: 'אנו עשויים לעדכן תנאים אלה בכל עת. המשך השימוש לאחר שינויים מהווה הסכמה לתנאים המעודכנים.',
    },
  ],
};
