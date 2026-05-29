// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import GuestSelector from '@/components/GuestSelector';

function setup(guests = 2, rooms = 1) {
  const onGuestsChange = vi.fn();
  const onRoomsChange = vi.fn();
  render(
    <GuestSelector
      guests={guests}
      rooms={rooms}
      onGuestsChange={onGuestsChange}
      onRoomsChange={onRoomsChange}
    />
  );
  return { onGuestsChange, onRoomsChange };
}

describe('GuestSelector', () => {
  it('shows a summary of guests and rooms', () => {
    setup(2, 1);
    expect(screen.getByText(/2 guests, 1 room/)).toBeInTheDocument();
  });

  it('uses singular labels for one guest and one room', () => {
    setup(1, 1);
    expect(screen.getByText(/1 guest, 1 room/)).toBeInTheDocument();
  });

  it('opens the popover on click', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByLabelText('Increase guests')).toBeNull();
    await user.click(screen.getByRole('button', { name: /guests/i }));
    expect(screen.getByLabelText('Increase guests')).toBeInTheDocument();
  });

  it('increments guests up to the max of 10', async () => {
    const user = userEvent.setup();
    const { onGuestsChange } = setup(2, 1);
    await user.click(screen.getByRole('button', { name: /2 guests/i }));
    await user.click(screen.getByLabelText('Increase guests'));
    expect(onGuestsChange).toHaveBeenCalledWith(3);
  });

  it('disables decrease when guests is at minimum', async () => {
    const user = userEvent.setup();
    setup(1, 1);
    await user.click(screen.getByRole('button', { name: /1 guest/i }));
    expect(screen.getByLabelText('Decrease guests')).toBeDisabled();
  });

  it('disables increase when rooms is at maximum', async () => {
    const user = userEvent.setup();
    setup(2, 5);
    await user.click(screen.getByRole('button', { name: /5 rooms/i }));
    expect(screen.getByLabelText('Increase rooms')).toBeDisabled();
  });
});
