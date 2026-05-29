// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DateSummary from '@/components/DateSummary';

describe('DateSummary', () => {
  it('renders night count for a valid range', () => {
    render(<DateSummary checkIn="2027-03-01" checkOut="2027-03-03" />);
    expect(screen.getByText('2 nights')).toBeInTheDocument();
  });

  it('uses singular "night" for a one-night stay', () => {
    render(<DateSummary checkIn="2027-03-01" checkOut="2027-03-02" />);
    expect(screen.getByText('1 night')).toBeInTheDocument();
  });

  it('returns null when checkIn is empty', () => {
    const { container } = render(<DateSummary checkIn="" checkOut="2027-03-03" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when checkOut is empty', () => {
    const { container } = render(<DateSummary checkIn="2027-03-01" checkOut="" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when checkout is before checkin (non-positive nights)', () => {
    const { container } = render(<DateSummary checkIn="2027-03-05" checkOut="2027-03-01" />);
    expect(container.firstChild).toBeNull();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <DateSummary checkIn="2027-03-01" checkOut="2027-03-03" className="mt-2" />
    );
    expect(container.firstChild).toHaveClass('mt-2');
  });
});
