// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import HolidayWarning from '@/components/HolidayWarning';

function mockFetch(holidays: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ holidays }),
  });
}

afterEach(() => vi.restoreAllMocks());

const PROPS = { country: 'FR', checkIn: '2027-07-13', checkOut: '2027-07-15' };

describe('HolidayWarning', () => {
  it('renders nothing when no holidays overlap', async () => {
    vi.stubGlobal('fetch', mockFetch([]));
    const { container } = render(<HolidayWarning {...PROPS} />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders nothing when required props are missing', () => {
    vi.stubGlobal('fetch', mockFetch([]));
    const { container } = render(<HolidayWarning country="" checkIn="" checkOut="" />);
    expect(container.firstChild).toBeNull();
  });

  it('warns when a holiday falls within the stay', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([{ date: '2027-07-14', name: 'Bastille Day', localName: 'Fête nationale' }])
    );
    render(<HolidayWarning {...PROPS} />);
    await waitFor(() => {
      expect(screen.getByText(/Public Holiday During Your Stay/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Fête nationale \(Bastille Day\)/)).toBeInTheDocument();
  });

  it('pluralizes the heading for multiple holidays', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch([
        { date: '2027-12-25', name: 'Christmas Day', localName: 'Christmas Day' },
        { date: '2027-12-26', name: 'Boxing Day', localName: 'Boxing Day' },
      ])
    );
    render(<HolidayWarning country="GB" checkIn="2027-12-24" checkOut="2027-12-27" />);
    await waitFor(() => {
      expect(screen.getByText(/Public Holidays During Your Stay/i)).toBeInTheDocument();
    });
  });
});
