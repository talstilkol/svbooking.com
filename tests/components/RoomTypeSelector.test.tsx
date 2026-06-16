// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import RoomTypeSelector from '@/components/RoomTypeSelector';
import { LocaleProvider } from '@/components/LocaleProvider';
import LocaleSwitcher from '@/components/LocaleSwitcher';

describe('RoomTypeSelector', () => {
  it('renders the Room Types heading', () => {
    render(<RoomTypeSelector />);
    expect(screen.getByRole('heading', { name: /Room Types/i })).toBeInTheDocument();
  });

  it('discloses that verified room data is unavailable', () => {
    render(<RoomTypeSelector />);
    expect(
      screen.getByText(/Verified room categories, occupancy limits/i)
    ).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    const { container } = render(<RoomTypeSelector className="mt-6" />);
    expect(container.firstChild).toHaveClass('mt-6');
  });

  it('switches unavailable room data disclosure to Hebrew', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LocaleSwitcher />
        <RoomTypeSelector />
      </LocaleProvider>
    );

    await user.click(screen.getByRole('button', { name: 'HE' }));

    expect(screen.getByRole('heading', { name: 'סוגי חדרים' })).toBeInTheDocument();
    expect(screen.getByText(/קטגוריות חדרים מאומתות/)).toBeInTheDocument();
  });
});
