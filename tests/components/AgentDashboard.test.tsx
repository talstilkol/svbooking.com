// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const localeStore = vi.hoisted(() => ({} as Record<string, unknown>));
const dashboardState = vi.hoisted(() => ({
  mode: 'restricted' as 'restricted' | 'data',
}));

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
  if (dashboardState.mode === 'data' && url.startsWith('/api/admin/agents/auto/status')) {
    return jsonResponse({
      agents: [
        {
          name: 'deal-scanner',
          label: 'Deal Scanner',
          icon: 'D',
          desc: 'Scans provider-returned rates',
          status: 'never-run',
        },
      ],
    });
  }
  if (dashboardState.mode === 'data' && url.startsWith('/api/admin/catalog/candidates')) {
    return jsonResponse({
      candidates: [
        {
          id: 'candidate-1',
          hotelKey: 'g1-d2',
          name: 'Source Hotel',
          city: 'Paris',
          country: 'France',
          status: 'pending',
          alreadyInCatalog: false,
          missingProvenance: true,
          missingLocation: true,
          duplicate: true,
          source: 'wikidata',
        },
      ],
      reviewSummary: {
        total: 3,
        pending: 2,
        readyToApprove: 2,
        missingProvenance: 1,
        missingLocation: 1,
        duplicate: 1,
        blockedPending: 1,
        bySource: [{ value: 'wikidata', count: 2 }],
        byCity: [{ value: 'Paris', count: 2 }],
      },
    });
  }
  return jsonResponse({ status: 'unauthorized' }, { status: 401 });
}

beforeEach(() => {
  dashboardState.mode = 'restricted';
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
    expect(screen.getByRole('heading', { name: 'Background Agents' })).toBeInTheDocument();

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
    expect(
      screen.getByText('Background agent operations require an authorized admin session.')
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Catalog Candidate Queue' })
    ).toBeInTheDocument();
    expect(screen.getByText('Admin access required')).toBeInTheDocument();
    expect(
      screen.getByText('Discovered catalog operations require an authorized admin session.')
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
    expect(screen.getByRole('heading', { name: 'סוכני רקע' })).toBeInTheDocument();
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
    expect(
      screen.getByText('פעולות סוכני רקע דורשות סשן מנהל מורשה.')
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'תור מועמדי קטלוג' })
    ).toBeInTheDocument();
    expect(screen.getByText('נדרשת גישת מנהל')).toBeInTheDocument();
    expect(
      screen.getByText('פעולות קטלוג שהתגלו דורשות סשן מנהל מורשה.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'מבצעי ספקים שנמצאו' })).toBeInTheDocument();
    expect(await screen.findByText('עדיין לא נסרקו מבצעים.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'סוכן זמינות מלונות' })).toBeInTheDocument();
    expect(screen.getByLabelText('בחירת מלון')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'בדיקת זמינות' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'סקירת מקורות מידע' })).toBeInTheDocument();
    expect(screen.getByText('מחירי מלונות מספקים זמינים')).toBeInTheDocument();
    expect(
      screen.getByText('הוסיפו מועדפים או שמרו טיולים כדי לקבל המלצות מותאמות אישית.')
    ).toBeInTheDocument();
  });

  it('localizes background-agent and candidate-queue controls when admin data is available', async () => {
    dashboardState.mode = 'data';
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <AgentDashboard />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(await screen.findByText('סורק מבצעים')).toBeInTheDocument();
    expect(
      screen.getByText('סורק מלונות מהקטלוג לאיתור מועמדי מבצע שהוחזרו מספקים')
    ).toBeInTheDocument();
    expect(screen.queryByText('Deal Scanner')).not.toBeInTheDocument();
    expect(screen.queryByText('Scans provider-returned rates')).not.toBeInTheDocument();
    expect(await screen.findByText('טרם רץ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'הרצה' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'תור מועמדי קטלוג' })).toBeInTheDocument();
    expect(screen.getByLabelText('מסנן סטטוס מועמדים')).toBeInTheDocument();
    expect(screen.getByLabelText('מסנן בעיות מועמדים')).toBeInTheDocument();
    expect(screen.getAllByText('חסר מקור').length).toBeGreaterThan(0);
    expect(screen.getAllByText('אין מיקום').length).toBeGreaterThan(0);
    expect(screen.getAllByText('כפול').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'אישור 2 מוכנים' })).toBeInTheDocument();
  });
});
