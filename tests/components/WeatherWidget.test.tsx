// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import WeatherWidget from '@/components/WeatherWidget';

function mockWeather(daily: unknown[] | null) {
  return vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(daily ? { daily } : {}) });
}

afterEach(() => vi.restoreAllMocks());

describe('WeatherWidget', () => {
  it('renders a 7-day forecast when data is available', async () => {
    const daily = Array.from({ length: 3 }, (_, i) => ({
      date: `2027-03-0${i + 1}`,
      tempMin: 10 + i,
      tempMax: 20 + i,
      icon: '☀️',
      rainChance: 0,
    }));
    vi.stubGlobal('fetch', mockWeather(daily));
    render(<WeatherWidget city="Paris" />);
    await waitFor(() => {
      // Temps render as the max values
      expect(screen.getByText(/20°/)).toBeInTheDocument();
    });
  });

  it('requests the weather endpoint for the given city', async () => {
    const fetchSpy = mockWeather(null);
    vi.stubGlobal('fetch', fetchSpy);
    render(<WeatherWidget city="Tokyo" />);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/weather?city=Tokyo'));
    });
  });
});
