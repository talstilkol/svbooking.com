// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ShareBar from '@/components/ShareBar';

const URL = 'https://svbooking.com/hotel/g1-d2';
const TITLE = 'Le Meurice';

describe('ShareBar', () => {
  it('renders the Share: label', () => {
    render(<ShareBar url={URL} title={TITLE} />);
    expect(screen.getByText('Share:')).toBeInTheDocument();
  });

  it('renders share links for all 5 platforms with correct targets', () => {
    render(<ShareBar url={URL} title={TITLE} />);
    expect(screen.getByLabelText('Share on WhatsApp')).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(screen.getByLabelText('Share on Telegram')).toHaveAttribute('href', expect.stringContaining('t.me'));
    expect(screen.getByLabelText('Share on Twitter')).toHaveAttribute('href', expect.stringContaining('twitter.com'));
    expect(screen.getByLabelText('Share on Facebook')).toHaveAttribute('href', expect.stringContaining('facebook.com'));
    expect(screen.getByLabelText('Share on Email')).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });

  it('encodes the URL into share links', () => {
    render(<ShareBar url={URL} title={TITLE} />);
    const fb = screen.getByLabelText('Share on Facebook');
    expect(fb.getAttribute('href')).toContain(encodeURIComponent(URL));
  });

  it('opens external links in a new tab safely', () => {
    render(<ShareBar url={URL} title={TITLE} />);
    const wa = screen.getByLabelText('Share on WhatsApp');
    expect(wa).toHaveAttribute('target', '_blank');
    expect(wa).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('copies the link to clipboard on Copy click', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<ShareBar url={URL} title={TITLE} />);
    await user.click(screen.getByLabelText('Copy link'));

    expect(writeText).toHaveBeenCalledWith(URL);
    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('accepts custom className', () => {
    const { container } = render(<ShareBar url={URL} title={TITLE} className="mt-3" />);
    expect(container.firstChild).toHaveClass('mt-3');
  });
});
