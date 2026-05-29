// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RoomTypeSelector from '@/components/RoomTypeSelector';

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
});
