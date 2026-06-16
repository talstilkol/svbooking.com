// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SafetyInfo from '@/components/SafetyInfo';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

function mockGuide(data: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data }) });
}

afterEach(() => vi.restoreAllMocks());

describe('SafetyInfo', () => {
  it('renders the city heading', async () => {
    vi.stubGlobal('fetch', mockGuide(null));
    render(<SafetyInfo city="Bangkok" />);
    expect(screen.getByText('Safety in Bangkok')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Verified safety guidance is unavailable for this city.')).toBeInTheDocument();
    });
  });

  it('shows a Wikivoyage badge and tips when data is available', async () => {
    vi.stubGlobal('fetch', mockGuide({ tips: ['Watch your belongings', 'Use licensed taxis'] }));
    render(<SafetyInfo city="Bangkok" />);
    await waitFor(() => {
      expect(screen.getByText('Wikivoyage')).toBeInTheDocument();
    });
    expect(screen.getByText('Watch your belongings')).toBeInTheDocument();
    expect(screen.getByText('Use licensed taxis')).toBeInTheDocument();
  });

  it('renders safe/unsafe areas when provided', async () => {
    vi.stubGlobal('fetch', mockGuide({ areas: [{ name: 'Old Town', safe: true, note: 'tourist friendly' }] }));
    render(<SafetyInfo city="Rome" />);
    await waitFor(() => expect(screen.getByText('Old Town')).toBeInTheDocument());
    expect(screen.getByText(/tourist friendly/)).toBeInTheDocument();
  });

  it('does not show the Wikivoyage badge when no data', async () => {
    vi.stubGlobal('fetch', mockGuide(null));
    render(<SafetyInfo city="Nowhere" />);
    await waitFor(() => expect(screen.getByText('Safety in Nowhere')).toBeInTheDocument());
    expect(screen.queryByText('Wikivoyage')).toBeNull();
  });

  it('switches heading and unavailable disclosure to Hebrew', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockGuide(null));
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <SafetyInfo city="Nowhere" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('בטיחות בNowhere')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('הנחיות בטיחות מאומתות אינן זמינות עבור עיר זו.')).toBeInTheDocument();
    });
  });
});
