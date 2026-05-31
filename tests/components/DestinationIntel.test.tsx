/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import DestinationIntel from '@/components/DestinationIntel';

describe('DestinationIntel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders Open-Meteo tempMax/tempMin fields from the API contract', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      city: 'Paris',
      weather: [{
        date: '2026-07-10',
        tempMin: 12,
        tempMax: 20,
        icon: 'sun',
        weather: 'Clear sky',
      }],
      holidays: [],
      localCurrency: null,
      daylight: null,
      hotelsAvailable: 2,
      sources: ['Open-Meteo', 'SV Booking catalog'],
      sourceStates: {
        weather: 'available',
        catalog: 'available',
      },
      dataPolicy: 'available-source-data-only',
    })));

    render(<DestinationIntel city="Paris" country="France" />);

    await waitFor(() => expect(screen.getByText('20° / 12°')).toBeInTheDocument());
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
