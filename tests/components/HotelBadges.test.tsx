// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import HotelBadges from '@/components/HotelBadges';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('HotelBadges', () => {
  it('renders the unavailable-badges notice', () => {
    render(<HotelBadges />);
    expect(
      screen.getByText(/Verified property badges are unavailable/i)
    ).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<HotelBadges className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });

  it('switches unavailable badge copy to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <HotelBadges />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('תגי נכס מאומתים אינם זמינים עד שיסופקו על ידי ספק מאומת.')).toBeInTheDocument();
  });
});
