// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import HotelAmenities from '@/components/HotelAmenities';

function mockAmenities(payload: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) });
}

afterEach(() => vi.restoreAllMocks());

describe('HotelAmenities', () => {
  it('always renders the Hotel Amenities heading', () => {
    vi.stubGlobal('fetch', mockAmenities({ amenities: null }));
    render(<HotelAmenities hotelKey="g1-d2" />);
    expect(screen.getByText('Hotel Amenities')).toBeInTheDocument();
  });

  it('renders amenity chips and a source badge when data exists', async () => {
    vi.stubGlobal(
      'fetch',
      mockAmenities({ amenities: [{ icon: '📶', label: 'WiFi' }, { icon: '🅿️', label: 'Parking' }], source: 'osm-source' })
    );
    render(<HotelAmenities hotelKey="g1-d2" />);
    await waitFor(() => expect(screen.getByText('WiFi')).toBeInTheDocument());
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('OSM source')).toBeInTheDocument();
  });

  it('shows "OSM cached" badge when source is cached', async () => {
    vi.stubGlobal(
      'fetch',
      mockAmenities({ amenities: [{ icon: '📶', label: 'WiFi' }], source: 'osm-cache' })
    );
    render(<HotelAmenities hotelKey="g1-d2" />);
    await waitFor(() => expect(screen.getByText('OSM cached')).toBeInTheDocument());
  });
});
