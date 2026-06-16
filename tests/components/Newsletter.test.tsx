// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// Mock storage to avoid Node 22 built-in localStorage conflicts
const mockStore: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { newsletter: 'svbooking:newsletter' },
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) =>
    mockStore[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import Newsletter from '@/components/Newsletter';

describe('Newsletter', () => {
  it('renders the signup form', () => {
    render(<Newsletter />);
    expect(screen.getByLabelText(/Email address for deal alerts/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Subscribe/i })).toBeInTheDocument();
  });

  it('shows confirmation after submitting a valid email', async () => {
    const user = userEvent.setup();
    render(<Newsletter />);
    await user.type(screen.getByLabelText(/Email address/i), 'traveler@example.com');
    await user.click(screen.getByRole('button', { name: /Subscribe/i }));
    expect(screen.getByText(/You're subscribed/i)).toBeInTheDocument();
  });

  it('persists the signup locally on submit', async () => {
    for (const k of Object.keys(mockStore)) delete mockStore[k];
    const user = userEvent.setup();
    render(<Newsletter />);
    await user.type(screen.getByLabelText(/Email address/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /Subscribe/i }));
    const stored = mockStore['svbooking:newsletter'] as { email: string }[];
    expect(stored).toHaveLength(1);
    expect(stored[0].email).toBe('a@b.com');
  });

  it('discloses that email delivery is not yet active', async () => {
    const user = userEvent.setup();
    render(<Newsletter />);
    await user.type(screen.getByLabelText(/Email address/i), 'x@y.com');
    await user.click(screen.getByRole('button', { name: /Subscribe/i }));
    expect(screen.getByText(/Email delivery remains unavailable/i)).toBeInTheDocument();
  });
});
