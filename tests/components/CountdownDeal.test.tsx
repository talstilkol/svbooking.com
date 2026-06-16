// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import CountdownDeal from '@/components/CountdownDeal';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('CountdownDeal', () => {
  it('renders the urgent English countdown state for nearby check-in dates', async () => {
    render(<CountdownDeal checkIn={daysFromNow(2)} />);

    await waitFor(() => {
      expect(screen.getByText('Check-in is very close')).toBeInTheDocument();
    });
    expect(screen.getByText('DATE SOON')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('switches urgent countdown labels to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <CountdownDeal checkIn={daysFromNow(2)} />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    await waitFor(() => {
      expect(screen.getByText('הצ׳ק-אין קרוב מאוד')).toBeInTheDocument();
    });
    expect(screen.getByText('תאריך קרוב')).toBeInTheDocument();
    expect(screen.getByText('ימים')).toBeInTheDocument();
  });
});
