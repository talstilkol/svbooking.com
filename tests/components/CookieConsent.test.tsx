// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the localStorage utility to avoid Node 22 built-in localStorage conflicts
const mockStore: Record<string, string> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { cookiesAccepted: 'sv_cookies_accepted' },
  readLocalStorageStringWithFallback: (key: string) => mockStore[key] ?? null,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = JSON.stringify(value);
  },
}));

import CookieConsent from '@/components/CookieConsent';

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

describe('CookieConsent', () => {
  it('shows banner after delay when consent not given', async () => {
    render(<CookieConsent />);
    expect(screen.queryByText(/cookies/i)).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/cookies/i)).toBeInTheDocument();
  });

  it('does not show banner when consent already given', async () => {
    mockStore['sv_cookies_accepted'] = JSON.stringify('true');
    render(<CookieConsent />);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/cookies/i)).toBeNull();
  });

  it('hides banner and saves "true" on Accept', async () => {
    render(<CookieConsent />);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    const user = userEvent.setup();
    await user.click(screen.getByText('Accept'));
    expect(screen.queryByText('Accept')).toBeNull();
    expect(mockStore['sv_cookies_accepted']).toBe(JSON.stringify('true'));
  });

  it('hides banner and saves "minimal" on Decline', async () => {
    render(<CookieConsent />);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    vi.useRealTimers();

    const user = userEvent.setup();
    await user.click(screen.getByText('Decline'));
    expect(screen.queryByText('Decline')).toBeNull();
    expect(mockStore['sv_cookies_accepted']).toBe(JSON.stringify('minimal'));
  });

  it('shows both Accept and Decline buttons', async () => {
    render(<CookieConsent />);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });
});
