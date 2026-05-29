// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import NearbyAttractions from '@/components/NearbyAttractions';

function mockPois(items: unknown[]) {
  return vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ pois: items }) });
}

afterEach(() => vi.restoreAllMocks());

describe('NearbyAttractions', () => {
  it('shows a loading skeleton with the heading initially', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); // never resolves
    render(<NearbyAttractions city="Paris" />);
    expect(screen.getByText('Nearby Attractions')).toBeInTheDocument();
  });

  it('renders attractions once loaded', async () => {
    vi.stubGlobal(
      'fetch',
      mockPois([
        { name: 'Eiffel Tower', type: 'Landmark', distance: '1.2 km', icon: '🗼' },
        { name: 'Louvre', type: 'Museum', distance: '2.0 km' },
      ])
    );
    render(<NearbyAttractions city="Paris" />);
    await waitFor(() => expect(screen.getByText('Eiffel Tower')).toBeInTheDocument());
    expect(screen.getByText('Louvre')).toBeInTheDocument();
  });
});
