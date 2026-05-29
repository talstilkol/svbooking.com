// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStore: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  readLocalStorageStringWithFallback: (key: string) => (mockStore[key] as string) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import Footer from '@/components/Footer';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('Footer i18n', () => {
  it('renders English footer content by default', () => {
    render(
      <LocaleProvider>
        <Footer />
      </LocaleProvider>
    );
    expect(screen.getByText('Browse Hotels')).toBeInTheDocument();
    expect(screen.getByText('About Us')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    // City links keep proper nouns, prefixed by translated "Hotels in"
    expect(screen.getByText('Hotels in Paris')).toBeInTheDocument();
  });

  it('switches footer content to Hebrew via the locale switcher', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <Footer />
      </LocaleProvider>
    );
    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('עיון במלונות')).toBeInTheDocument(); // Browse Hotels
    expect(screen.getByText('אודות')).toBeInTheDocument(); // About Us
    expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument(); // Privacy Policy
    expect(screen.getByText('מלונות ב Paris')).toBeInTheDocument(); // Hotels in Paris
  });
});
