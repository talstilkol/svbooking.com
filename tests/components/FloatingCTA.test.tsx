// @vitest-environment jsdom
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach } from 'vitest';
import FloatingCTA from '@/components/FloatingCTA';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

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

  it('switches the floating action copy to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <FloatingCTA hotelName="Le Meurice" cheapestPrice={350} provider="Xotelo" />
      </LocaleProvider>
    );
    act(() => {
      setScrollY(700);
      fireEvent.scroll(window);
    });

    expect(screen.getByText('See Prices')).toBeInTheDocument();
    expect(screen.getByText(/via Xotelo/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'HE' }));
    expect(screen.getByText('הצגת מחירים')).toBeInTheDocument();
    expect(screen.getByText(/דרך Xotelo/)).toBeInTheDocument();
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
