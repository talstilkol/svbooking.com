// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import DeepLink from '@/components/DeepLink';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('DeepLink', () => {
  it('renders Get Link button', () => {
    render(<DeepLink hotelKey="g1-d2" hotelName="Test Hotel" />);
    expect(screen.getByText(/Get Link/)).toBeInTheDocument();
  });

  it('toggles link panel on click', async () => {
    const user = userEvent.setup();
    render(<DeepLink hotelKey="g1-d2" hotelName="Test Hotel" />);
    expect(screen.queryByText('Shareable Links')).toBeNull();

    await user.click(screen.getByText(/Get Link/));
    expect(screen.getByText('Shareable Links')).toBeInTheDocument();

    await user.click(screen.getByText(/Get Link/));
    expect(screen.queryByText('Shareable Links')).toBeNull();
  });

  it('generates correct hotel page URL', async () => {
    const user = userEvent.setup();
    render(
      <DeepLink
        hotelKey="g187147-d188728"
        hotelName="Le Meurice"
        checkIn="2027-01-10"
        checkOut="2027-01-12"
      />
    );
    await user.click(screen.getByText(/Get Link/));

    const inputs = screen.getAllByRole('textbox');
    const hotelPageInput = inputs[0] as HTMLInputElement;
    expect(hotelPageInput.value).toContain('/hotel/g187147-d188728');
    expect(hotelPageInput.value).toContain('checkIn=2027-01-10');
    expect(hotelPageInput.value).toContain('checkOut=2027-01-12');
  });

  it('generates correct compare URL', async () => {
    const user = userEvent.setup();
    render(
      <DeepLink
        hotelKey="g187147-d188728"
        hotelName="Le Meurice"
        checkIn="2027-01-10"
        checkOut="2027-01-12"
      />
    );
    await user.click(screen.getByText(/Get Link/));

    const inputs = screen.getAllByRole('textbox');
    const compareInput = inputs[1] as HTMLInputElement;
    expect(compareInput.value).toContain('/compare?hotelKey=g187147-d188728');
  });

  it('copies URL to clipboard on Copy click', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<DeepLink hotelKey="g1-d2" hotelName="Test Hotel" />);
    await user.click(screen.getByText(/Get Link/));

    const copyButtons = screen.getAllByText('Copy');
    await user.click(copyButtons[0]);

    expect(writeText).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getAllByText('✓').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches link panel labels to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <DeepLink hotelKey="g1-d2" hotelName="Test Hotel" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    await user.click(screen.getByText(/קבלת קישור/));

    expect(screen.getByText('קישורים לשיתוף')).toBeInTheDocument();
    expect(screen.getByText('עמוד המלון:')).toBeInTheDocument();
    expect(screen.getByText('השוואה מלאה:')).toBeInTheDocument();
    expect(screen.getAllByText('העתקה')).toHaveLength(2);
  });
});
