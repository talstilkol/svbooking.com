// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Deterministic storage mock (avoids Node 22 built-in localStorage conflict)
const mockStore: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  readLocalStorageStringWithFallback: (key: string) => (mockStore[key] as string) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import { LocaleProvider, useLocale } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

function Probe() {
  const { locale, dir, t } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="t">{t('searchHotels')}</span>
    </div>
  );
}

describe('LocaleProvider', () => {
  it('defaults to English with ltr direction', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('dir')).toHaveTextContent('ltr');
  });

  it('translates a known dictionary key', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );
    expect(screen.getByTestId('t')).toHaveTextContent('Search hotels');
  });

  it('useLocale falls back safely outside a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('t')).toHaveTextContent('Search hotels');
  });
});

describe('LocaleSwitcher', () => {
  it('renders a button per supported locale', () => {
    render(
      <LocaleProvider>
        <LocaleSwitcher />
      </LocaleProvider>
    );
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HE' })).toBeInTheDocument();
  });

  it('switches to Hebrew, sets RTL and aria-pressed, and persists', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <Probe />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByTestId('locale')).toHaveTextContent('he');
    expect(screen.getByTestId('dir')).toHaveTextContent('rtl');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
    expect(screen.getByRole('button', { name: 'HE' })).toHaveAttribute('aria-pressed', 'true');
    expect(mockStore['svbooking:locale']).toBe('he');
  });

  it('translates dictionary keys into Hebrew after switching', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <Probe />
      </LocaleProvider>
    );
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByTestId('t')).toHaveTextContent('חיפוש מלונות');
  });
});

describe('Navbar translations', () => {
  it('localizes nav link labels to Hebrew after switching', async () => {
    const user = userEvent.setup();
    function NavProbe() {
      const { t } = useLocale();
      return <span data-testid="nav-search">{t('navSearch')}</span>;
    }
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <NavProbe />
      </LocaleProvider>
    );
    expect(screen.getByTestId('nav-search')).toHaveTextContent('Search');
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByTestId('nav-search')).toHaveTextContent('חיפוש');
  });
});
