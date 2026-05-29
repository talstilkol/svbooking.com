// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import ProviderInfo from '@/components/ProviderInfo';

describe('ProviderInfo', () => {
  it('renders an info button for a known provider', () => {
    render(<ProviderInfo provider="Booking.com" />);
    expect(screen.getByLabelText('Info about Booking.com')).toBeInTheDocument();
  });

  it('returns nothing for an unknown provider', () => {
    const { container } = render(<ProviderInfo provider="Unknown OTA" />);
    expect(container.firstChild).toBeNull();
  });

  it('toggles the info tooltip on click', async () => {
    const user = userEvent.setup();
    render(<ProviderInfo provider="Agoda.com" />);
    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.click(screen.getByLabelText('Info about Agoda.com'));
    const tip = screen.getByRole('tooltip');
    expect(tip).toBeInTheDocument();
    expect(tip).toHaveTextContent(/Asia-Pacific/i);
    expect(tip).toHaveTextContent(/Founded: 2005/);
  });

  it('sets aria-expanded when open', async () => {
    const user = userEvent.setup();
    render(<ProviderInfo provider="Expedia" />);
    const btn = screen.getByLabelText('Info about Expedia');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});
