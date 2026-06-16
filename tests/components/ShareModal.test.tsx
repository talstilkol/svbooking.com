// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareModal from '@/components/ShareModal';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

const PROPS = { url: 'https://svbooking.com/hotel/g1-d2', title: 'Le Meurice', description: 'Compare prices' };

beforeEach(() => {
  // Force the modal fallback path (no native share)
  Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true });
});

describe('ShareModal', () => {
  it('renders a Share trigger button', () => {
    render(<ShareModal {...PROPS} />);
    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument();
  });

  it('opens the modal with platform links when native share is unavailable', async () => {
    const user = userEvent.setup();
    render(<ShareModal {...PROPS} />);
    await user.click(screen.getByRole('button', { name: /Share/i }));

    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    const wa = screen.getByText('WhatsApp').closest('a');
    expect(wa).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(wa).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the URL in a read-only field and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ShareModal {...PROPS} />);
    await user.click(screen.getByRole('button', { name: /Share/i }));

    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, writable: true, configurable: true });
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(PROPS.url);
    await waitFor(() => expect(screen.getByText('✓ Copied!')).toBeInTheDocument());
  });

  it('uses native share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, writable: true, configurable: true });
    const user = userEvent.setup();
    render(<ShareModal {...PROPS} />);
    await user.click(screen.getByRole('button', { name: /Share/i }));
    expect(share).toHaveBeenCalledWith({ title: PROPS.title, text: PROPS.description, url: PROPS.url });
  });

  it('switches share dialog copy to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <ShareModal {...PROPS} />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    await user.click(screen.getByRole('button', { name: 'שיתוף' }));

    expect(screen.getByRole('heading', { name: 'שיתוף' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'העתקה' })).toBeInTheDocument();
  });
});
