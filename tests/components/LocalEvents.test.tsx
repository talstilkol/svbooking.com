// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocalEvents from '@/components/LocalEvents';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

afterEach(() => vi.restoreAllMocks());

function mockEmptyEventSources() {
  return vi.fn((input: string | URL | Request) => {
    const url = String(input);
    const body = url.includes('/api/events') ? { events: [] } : { data: null };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
}

describe('LocalEvents', () => {
  it('shows explicit unavailable event state when sources return no verified data', async () => {
    vi.stubGlobal('fetch', mockEmptyEventSources());
    render(<LocalEvents city="Paris" />);

    await waitFor(() => {
      expect(screen.getByText('Verified event data is unavailable for Paris.')).toBeInTheDocument();
    });
  });

  it('switches unavailable event state to Hebrew', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockEmptyEventSources());
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <LocalEvents city="Paris" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    await waitFor(() => {
      expect(screen.getByText('נתוני אירועים מאומתים אינם זמינים עבור Paris.')).toBeInTheDocument();
    });
  });
});
