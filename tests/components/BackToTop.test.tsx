// @vitest-environment jsdom
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import BackToTop from '@/components/BackToTop';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, writable: true, configurable: true });
}

afterEach(() => {
  setScrollY(0);
  vi.restoreAllMocks();
});

describe('BackToTop', () => {
  it('is hidden initially (scrollY = 0)', () => {
    render(<BackToTop />);
    expect(screen.queryByLabelText('Back to top')).toBeNull();
  });

  it('appears after scrolling past 400px', () => {
    render(<BackToTop />);
    act(() => {
      setScrollY(500);
      fireEvent.scroll(window);
    });
    expect(screen.getByLabelText('Back to top')).toBeInTheDocument();
  });

  it('stays hidden when scroll is below threshold', () => {
    render(<BackToTop />);
    act(() => {
      setScrollY(300);
      fireEvent.scroll(window);
    });
    expect(screen.queryByLabelText('Back to top')).toBeNull();
  });

  it('scrolls to top when clicked', async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { value: scrollTo, writable: true, configurable: true });

    render(<BackToTop />);
    act(() => {
      setScrollY(500);
      fireEvent.scroll(window);
    });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Back to top'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
