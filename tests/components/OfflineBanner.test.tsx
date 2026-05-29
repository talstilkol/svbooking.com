// @vitest-environment jsdom
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import OfflineBanner from '@/components/OfflineBanner';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true });
}

afterEach(() => setOnline(true));

describe('OfflineBanner', () => {
  it('renders nothing while online', () => {
    setOnline(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('appears when an offline event fires', () => {
    setOnline(true);
    render(<OfflineBanner />);
    act(() => {
      fireEvent(window, new Event('offline'));
    });
    expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
  });

  it('can be dismissed', async () => {
    const user = userEvent.setup();
    render(<OfflineBanner />);
    act(() => {
      fireEvent(window, new Event('offline'));
    });
    expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText('Dismiss offline notice'));
    expect(screen.queryByText(/You're offline/i)).toBeNull();
  });

  it('hides again when back online', () => {
    render(<OfflineBanner />);
    act(() => { fireEvent(window, new Event('offline')); });
    expect(screen.getByText(/You're offline/i)).toBeInTheDocument();
    act(() => { fireEvent(window, new Event('online')); });
    expect(screen.queryByText(/You're offline/i)).toBeNull();
  });
});
