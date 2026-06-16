// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const localeStore = vi.hoisted(() => ({} as Record<string, unknown>));

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  readLocalStorageStringWithFallback: (key: string) =>
    (localeStore[key] as string | undefined) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    localeStore[key] = value;
  },
}));

vi.mock('@/lib/useLocalStorage', () => ({
  useFavorites: () => ({ favorites: [] }),
  useTrips: () => ({ trips: [] }),
}));

import AgentDashboard from '@/components/AgentDashboard';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { LocaleProvider } from '@/components/LocaleProvider';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function dashboardFetch(input: RequestInfo | URL) {
  const url = String(input);
  if (url.startsWith('/api/agents/deals')) return jsonResponse({ topDeals: [] });
  if (url.startsWith('/api/compare')) return jsonResponse({ hotels: [] });
  return jsonResponse({ status: 'unauthorized' }, { status: 401 });
}

beforeEach(() => {
  for (const key of Object.keys(localeStore)) delete localeStore[key];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => dashboardFetch(input)));
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('AgentDashboard localized operational panels', () => {
  it('renders the top operational panels and restricted states in English', async () => {
    render(<AgentDashboard />);

    expect(screen.getByRole('heading', { name: 'Production Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'System Health' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pricing Providers' })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Production readiness metrics require an authorized admin session.')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('Operational health checks require an authorized admin session.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Provider operations require an authorized admin session.')
    ).toBeInTheDocument();
  });

  it('switches the top operational panels and restricted states to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <AgentDashboard />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('heading', { name: 'מוכנות Production' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'בריאות המערכת' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ספקי מחירים' })).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText('מדדי מוכנות Production דורשים סשן מנהל מורשה.')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText('בדיקות בריאות תפעוליות דורשות סשן מנהל מורשה.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('פעולות ספקים דורשות סשן מנהל מורשה.')
    ).toBeInTheDocument();
  });
});
