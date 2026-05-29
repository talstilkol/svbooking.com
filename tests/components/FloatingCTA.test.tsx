// @vitest-environment jsdom
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import FloatingCTA from '@/components/FloatingCTA';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, writable: true, configurable: true });
}

afterEach(() => setScrollY(0));

describe('FloatingCTA', () => {
  it('is hidden before scrolling', () => {
    render(<FloatingCTA hotelName="Le Meurice" cheapestPrice={350} />);
    expect(screen.queryByText('Le Meurice')).toBeNull();
  });

  it('appears after scrolling past 600px when a price exists', () => {
    render(<FloatingCTA hotelName="Le Meurice" cheapestPrice={350} />);
    act(() => {
      setScrollY(700);
      fireEvent.scroll(window);
    });
    expect(screen.getByText('Le Meurice')).toBeInTheDocument();
  });

  it('stays hidden when there is no price even after scrolling', () => {
    render(<FloatingCTA hotelName="No Price Hotel" />);
    act(() => {
      setScrollY(700);
      fireEvent.scroll(window);
    });
    expect(screen.queryByText('No Price Hotel')).toBeNull();
  });
});
