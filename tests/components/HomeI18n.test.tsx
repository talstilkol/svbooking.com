// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: {
    locale: 'svbooking:locale',
    newsletter: 'svbooking:newsletter',
    priceAlerts: 'svbooking:price-alerts',
  },
  readLocalStorageStringWithFallback: (key: string) => (store[key] as string) ?? null,
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) => store[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => { store[key] = value; },
}));

import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import TrustBadges from '@/components/TrustBadges';
import Newsletter from '@/components/Newsletter';
import WhyChooseUs from '@/components/WhyChooseUs';
import FAQ from '@/components/FAQ';
import PriceAlert from '@/components/PriceAlert';
import PriceAlertsDashboard from '@/components/PriceAlertsDashboard';

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('TrustBadges i18n', () => {
  it('renders English by default and switches to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <TrustBadges />
      </LocaleProvider>
    );
    expect(screen.getByText('Secure & Private')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('מאובטח ופרטי')).toBeInTheDocument(); // Secure & Private
    expect(screen.getByText('מחירי ספקים')).toBeInTheDocument(); // Provider Rates
  });

  it('keeps dynamic stat counts in the badge after switching', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <TrustBadges />
      </LocaleProvider>
    );
    await user.click(screen.getByRole('button', { name: 'HE' }));
    // "<n> ערים" (Cities) — number preserved, word translated
    expect(screen.getByText(/\d+ ערים/)).toBeInTheDocument();
  });
});

describe('Newsletter i18n', () => {
  it('switches the form copy to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <Newsletter />
      </LocaleProvider>
    );
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByRole('button', { name: 'הרשמה' })).toBeInTheDocument(); // Subscribe
    expect(screen.getByText('שמירת העדפות התראות מבצעים מקומית')).toBeInTheDocument();
  });
});

describe('Price alert i18n', () => {
  it('switches hotel detail alert controls to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <PriceAlert
          hotelKey="g1-d2"
          hotelName="Le Meurice"
          city="Paris"
          checkIn="2026-07-01"
          checkOut="2026-07-03"
          currentPrice={300}
        />
      </LocaleProvider>
    );

    expect(screen.getByRole('button', { name: /Set price alert/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'HE' }));
    await user.click(screen.getByRole('button', { name: /הגדרת התראת מחיר/ }));

    expect(screen.getByText('התראת מחיר עבור Le Meurice', { exact: false })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('מחיר יעד ללילה')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'שמירה' })).toBeInTheDocument();
  });

  it('switches saved alert dashboard copy to Hebrew', async () => {
    const user = userEvent.setup();
    store['svbooking:price-alerts'] = [{
      hotelKey: 'g1-d2',
      hotelName: 'Le Meurice',
      city: 'Paris',
      targetPrice: 250,
      currency: 'USD',
      storage: 'local',
      unsubscribeStatus: 'not-configured',
    }];

    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <PriceAlertsDashboard />
      </LocaleProvider>
    );

    await screen.findByText('Price Alerts');
    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('התראות מחיר')).toBeInTheDocument();
    expect(screen.getByText('1 התראה פעילה')).toBeInTheDocument();
    expect(screen.getByText(/מכשיר מקומי/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'הסרת התראה עבור Le Meurice' })).toBeInTheDocument();
  });
});

describe('WhyChooseUs i18n', () => {
  it('switches the heading and reason titles to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <WhyChooseUs />
      </LocaleProvider>
    );
    expect(screen.getByText('Why travelers choose SV Booking')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('למה מטיילים בוחרים ב‑SV Booking')).toBeInTheDocument();
    expect(screen.getByText('השוואת ספקים זמינים')).toBeInTheDocument(); // Compare available providers
  });
});

describe('FAQ i18n', () => {
  it('switches questions to Hebrew and interpolates catalog stats', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <FAQ />
      </LocaleProvider>
    );
    expect(screen.getByText('How does SV Booking compare hotel prices?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('כיצד SV Booking משווה מחירי מלונות?')).toBeInTheDocument();

    // Open the coverage question; Hebrew answer keeps interpolated numeric stats.
    await user.click(screen.getByText('בכמה ערים ומלונות אתם מכסים?'));
    expect(screen.getByText(/\d+ מלונות ב‑\d+ ערים ו‑\d+ מדינות/)).toBeInTheDocument();
  });
});
