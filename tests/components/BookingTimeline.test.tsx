// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import BookingTimeline from '@/components/BookingTimeline';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('BookingTimeline', () => {
  it('renders all four journey steps', () => {
    render(<BookingTimeline checkIn="" checkOut="" />);
    expect(screen.getByText('Your Booking Journey')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
  });

  it('prompts to select dates when none are given', () => {
    render(<BookingTimeline checkIn="" checkOut="" />);
    expect(screen.getByText('Select dates to compare')).toBeInTheDocument();
  });

  it('shows the date range on the compare step when dates exist', () => {
    render(<BookingTimeline checkIn="2027-03-01" checkOut="2027-03-03" />);
    expect(screen.getByText('2027-03-01 to 2027-03-03')).toBeInTheDocument();
  });

  it('reflects saved state on the save step', () => {
    render(<BookingTimeline checkIn="2027-03-01" checkOut="2027-03-03" hasCompared hasSaved />);
    expect(screen.getByText('Saved to trips')).toBeInTheDocument();
  });

  it('switches journey labels to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <BookingTimeline checkIn="2027-03-01" checkOut="2027-03-03" hasCompared hasSaved />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByText('מסלול ההזמנה שלך')).toBeInTheDocument();
    expect(screen.getByText('חיפוש')).toBeInTheDocument();
    expect(screen.getByText('2027-03-01 עד 2027-03-03')).toBeInTheDocument();
    expect(screen.getByText('נשמר לטיולים')).toBeInTheDocument();
  });
});
