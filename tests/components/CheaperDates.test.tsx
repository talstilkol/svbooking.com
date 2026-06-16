// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheaperDates from '@/components/CheaperDates';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

afterEach(() => vi.restoreAllMocks());

function mockCheaperDates(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(payload) });
}

const emptyResult = {
  originalDates: { checkIn: '2027-03-01', checkOut: '2027-03-03', nights: 2 },
  originalPrice: 700,
  originalProvider: null,
  alternatives: { near: [], week: [], month: [] },
  cheapestOverall: null,
  hasRealData: false,
  dataPolicy: 'unavailable-until-provider-observations-exist',
};

describe('CheaperDates', () => {
  it('shows explicit unavailable cheaper-date intelligence in English', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockCheaperDates(emptyResult));
    render(<CheaperDates hotelKey="g1-d2" checkIn="2027-03-01" checkOut="2027-03-03" />);

    await user.click(screen.getByRole('button', { name: 'Find Cheaper Dates' }));

    await waitFor(() => {
      expect(screen.getByText('Cheaper-date intelligence is unavailable until provider or source observations exist for these dates.')).toBeInTheDocument();
    });
    expect(screen.getByText('No cheaper alternatives found in this range.')).toBeInTheDocument();
  });

  it('switches unavailable cheaper-date copy to Hebrew', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', mockCheaperDates(emptyResult));
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <CheaperDates hotelKey="g1-d2" checkIn="2027-03-01" checkOut="2027-03-03" />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));
    await user.click(screen.getByRole('button', { name: 'מציאת תאריכים זולים יותר' }));

    await waitFor(() => {
      expect(screen.getByText('מודיעין תאריכים זולים יותר אינו זמין עד שיהיו תצפיות מספקים או ממקורות עבור התאריכים האלה.')).toBeInTheDocument();
    });
    expect(screen.getByText('לא נמצאו חלופות זולות יותר בטווח הזה.')).toBeInTheDocument();
  });
});
