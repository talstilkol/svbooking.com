// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import HotelPolicies from '@/components/HotelPolicies';
import ReviewHighlights from '@/components/ReviewHighlights';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('HotelPolicies', () => {
  it('renders the heading and unavailable-policy disclosure', () => {
    render(<HotelPolicies />);
    expect(screen.getByRole('heading', { name: /Hotel Policies/i })).toBeInTheDocument();
    expect(screen.getByText(/Verified property policy data is unavailable/i)).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<HotelPolicies className="mt-5" />);
    expect(container.firstChild).toHaveClass('mt-5');
  });

  it('switches policy disclosure to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <HotelPolicies />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('heading', { name: 'מדיניות המלון' })).toBeInTheDocument();
    expect(screen.getByText(/נתוני מדיניות נכס מאומתים אינם זמינים/)).toBeInTheDocument();
  });
});

describe('ReviewHighlights', () => {
  it('renders the hotel name and unavailable status', () => {
    render(<ReviewHighlights hotelKey="g1-d2" hotelName="Le Meurice" />);
    expect(screen.getByText(/Verified guest review data for Le Meurice is unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: unavailable/i)).toBeInTheDocument();
  });

  it('switches unavailable review copy to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <ReviewHighlights hotelKey="g1-d2" hotelName="Le Meurice" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('heading', { name: 'ביקורות אורחים' })).toBeInTheDocument();
    expect(screen.getByText(/נתוני ביקורות אורחים מאומתים עבור Le Meurice אינם זמינים/)).toBeInTheDocument();
    expect(screen.getByText('סטטוס: לא זמין')).toBeInTheDocument();
  });
});
