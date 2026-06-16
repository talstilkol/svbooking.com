// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  hotelKey: 'g187147-d188728',
}));

const localeStore = vi.hoisted(() => ({} as Record<string, unknown>));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: navigationMock.hotelKey }),
  useRouter: () => ({ push: navigationMock.push }),
}));

vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { locale: 'svbooking:locale' },
  readLocalStorageStringWithFallback: (key: string) =>
    (localeStore[key] as string | undefined) ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    localeStore[key] = value;
  },
}));

import BookPage from '@/app/book/[id]/page';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { LocaleProvider } from '@/components/LocaleProvider';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function hotelPayload() {
  return {
    hotel: {
      hotelKey: 'g187147-d188728',
      name: 'Le Meurice',
      city: 'Paris',
      country: 'France',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
    },
  };
}

beforeEach(() => {
  navigationMock.push.mockClear();
  navigationMock.hotelKey = 'g187147-d188728';
  for (const key of Object.keys(localeStore)) delete localeStore[key];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/api/compare')) return jsonResponse(hotelPayload());
    return jsonResponse({ status: 'saved' });
  }));
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

describe('BookPage', () => {
  it('renders the booking form with accessible English controls', async () => {
    render(<BookPage />);

    expect(
      await screen.findByRole('heading', { name: 'Plan trip: Le Meurice' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to compare/ })).toHaveAttribute(
      'href',
      '/compare?hotelKey=g187147-d188728'
    );
    expect(screen.getByLabelText('Check-in')).toBeInTheDocument();
    expect(screen.getByLabelText('Check-out')).toBeInTheDocument();
    expect(screen.getByLabelText('Guests')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save trip' })).toBeInTheDocument();
  });

  it('switches the booking form controls to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <BookPage />
      </LocaleProvider>
    );

    await screen.findByRole('heading', { name: 'Plan trip: Le Meurice' });
    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('heading', { name: 'תכנון טיול: Le Meurice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /חזרה להשוואה/ })).toBeInTheDocument();
    expect(screen.getByLabelText('כניסה')).toBeInTheDocument();
    expect(screen.getByLabelText('יציאה')).toBeInTheDocument();
    expect(screen.getByLabelText('אורחים')).toBeInTheDocument();
    expect(screen.getByLabelText('הערות (אופציונלי)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'שמירת הטיול' })).toBeInTheDocument();
  });

  it('validates date order before saving a trip', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    render(<BookPage />);

    await screen.findByRole('heading', { name: 'Plan trip: Le Meurice' });
    fireEvent.change(screen.getByLabelText('Check-in'), {
      target: { value: '2027-06-10' },
    });
    fireEvent.change(screen.getByLabelText('Check-out'), {
      target: { value: '2027-06-09' },
    });
    await user.click(screen.getByRole('button', { name: 'Save trip' }));

    expect(screen.getByText('Check-in must be before check-out')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) => String(input) === '/api/me/trips')
    ).toBe(false);
    expect(navigationMock.push).not.toHaveBeenCalled();
  });
});
