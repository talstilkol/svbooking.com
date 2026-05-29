// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale', newsletter: 'svbooking:newsletter' },
  readLocalStorageStringWithFallback: (key: string) => (store[key] as string) ?? null,
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) => store[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => { store[key] = value; },
}));

import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import TrustBadges from '@/components/TrustBadges';
import Newsletter from '@/components/Newsletter';

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
