// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AuthControls from '@/components/AuthControls';

function mockFetch(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(payload),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthControls', () => {
  it('shows a Sign in link when not authenticated', async () => {
    vi.stubGlobal('fetch', mockFetch({ authenticated: false, user: null }));
    render(<AuthControls />);
    await waitFor(() => {
      const signIn = screen.getByText('Sign in');
      expect(signIn).toBeInTheDocument();
      expect(signIn).toHaveAttribute('href', '/api/auth/login');
    });
  });

  it('shows account + sign out when authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ authenticated: true, user: { givenName: 'Tal', email: 't@x.com' } })
    );
    render(<AuthControls />);
    await waitFor(() => {
      expect(screen.getByText('Tal')).toBeInTheDocument();
    });
    const signOut = screen.getByText('Sign out');
    expect(signOut).toHaveAttribute('href', '/api/auth/logout');
  });

  it('falls back to email when no given name', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ authenticated: true, user: { givenName: null, email: 'user@example.com' } })
    );
    render(<AuthControls />);
    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });
  });

  it('fails safe to Sign in when the status check errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    render(<AuthControls />);
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });
});
