// @vitest-environment jsdom
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import StickyCompareBar from '@/components/StickyCompareBar';

function setScrollY(v: number) {
  Object.defineProperty(window, 'scrollY', { value: v, writable: true, configurable: true });
}
afterEach(() => setScrollY(0));

const PROPS = { hotelName: 'Le Meurice', cheapestProvider: 'Booking.com', cheapestPrice: 350, currency: 'USD', nights: 2 };

describe('StickyCompareBar', () => {
  it('is hidden at the top of the page', () => {
    render(<StickyCompareBar {...PROPS} />);
    expect(screen.queryByText('Le Meurice')).toBeNull();
  });

  it('appears after scrolling past 400px', () => {
    render(<StickyCompareBar {...PROPS} />);
    act(() => {
      setScrollY(500);
      fireEvent.scroll(window);
    });
    expect(screen.getByText('Le Meurice')).toBeInTheDocument();
    expect(screen.getByText(/Lowest returned price from Booking.com/)).toBeInTheDocument();
  });

  it('never shows without a cheapest price', () => {
    render(<StickyCompareBar hotelName="X" visible />);
    act(() => {
      setScrollY(500);
      fireEvent.scroll(window);
    });
    expect(screen.queryByText('X')).toBeNull();
  });

  it('stays hidden when visible=false', () => {
    render(<StickyCompareBar {...PROPS} visible={false} />);
    act(() => {
      setScrollY(500);
      fireEvent.scroll(window);
    });
    expect(screen.queryByText('Le Meurice')).toBeNull();
  });
});
