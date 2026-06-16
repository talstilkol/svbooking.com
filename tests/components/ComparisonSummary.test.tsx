// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ComparisonSummary from '@/components/ComparisonSummary';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import type { ProviderRate } from '@/lib/types';

function rate(provider: string, total: number): ProviderRate {
  return {
    provider,
    code: provider.toLowerCase(),
    rate: total,
    tax: 0,
    total,
    currency: 'USD',
    source: 'verified-provider',
    freshness: 'live',
    partial: false,
    deepLink: null,
    taxesIncluded: true,
    priceAccuracyState: 'unobserved',
  } as ProviderRate;
}

const RATES = [rate('Booking.com', 200), rate('Expedia', 250)];

describe('ComparisonSummary', () => {
  it('returns null when there are no rates', () => {
    const { container } = render(
      <ComparisonSummary
        hotelName="Le Meurice"
        city="Paris"
        checkIn="2027-03-01"
        checkOut="2027-03-03"
        rates={[]}
        cheapest={null}
        savingsPct={0}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the copy button when rates exist', () => {
    render(
      <ComparisonSummary
        hotelName="Le Meurice"
        city="Paris"
        checkIn="2027-03-01"
        checkOut="2027-03-03"
        rates={RATES}
        cheapest={RATES[0]}
        savingsPct={20}
      />
    );
    expect(screen.getByText(/Copy price summary/i)).toBeInTheDocument();
  });

  it('copies a formatted summary to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <ComparisonSummary
        hotelName="Le Meurice"
        city="Paris"
        checkIn="2027-03-01"
        checkOut="2027-03-03"
        rates={RATES}
        cheapest={RATES[0]}
        savingsPct={20}
      />
    );

    await user.click(screen.getByText(/Copy price summary/i));
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('Le Meurice (Paris)');
    expect(copied).toContain('Booking.com: USD 200.00');
    expect(copied).toContain('Returned-provider difference: 20% vs highest returned option');

    await waitFor(() => {
      expect(screen.getByText(/Summary copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it('omits the savings line when savingsPct is 0', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <ComparisonSummary
        hotelName="Hotel X"
        city="Tokyo"
        checkIn="2027-03-01"
        checkOut="2027-03-02"
        rates={[rate('OnlyProvider', 100)]}
        cheapest={rate('OnlyProvider', 100)}
        savingsPct={0}
      />
    );

    await user.click(screen.getByText(/Copy price summary/i));
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).not.toContain('Save');
  });

  it('switches the copy button and copied summary to Hebrew', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <ComparisonSummary
          hotelName="Le Meurice"
          city="Paris"
          checkIn="2027-03-01"
          checkOut="2027-03-03"
          rates={RATES}
          cheapest={RATES[0]}
          savingsPct={20}
        />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    await user.click(screen.getByText(/העתקת סיכום מחירים/));

    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('המחיר הנמוך ביותר שהוחזר');
    expect(copied).toContain('הפרש בין מחירי הספקים שהוחזרו: 20%');
    await waitFor(() => {
      expect(screen.getByText(/סיכום המחירים הועתק ללוח/)).toBeInTheDocument();
    });
  });
});
