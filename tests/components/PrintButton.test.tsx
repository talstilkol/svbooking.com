// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import PrintButton from '@/components/PrintButton';

describe('PrintButton', () => {
  it('renders an accessible print button', () => {
    render(<PrintButton />);
    expect(screen.getByLabelText('Print this page')).toBeInTheDocument();
  });

  it('calls window.print on click', async () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', { value: print, writable: true, configurable: true });
    const user = userEvent.setup();
    render(<PrintButton />);
    await user.click(screen.getByLabelText('Print this page'));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('is hidden in print output (print:hidden)', () => {
    render(<PrintButton className="extra" />);
    const btn = screen.getByLabelText('Print this page');
    expect(btn).toHaveClass('print:hidden', 'extra');
  });
});
