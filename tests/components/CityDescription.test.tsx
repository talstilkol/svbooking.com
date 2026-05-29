// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import CityDescription from '@/components/CityDescription';

function mockCity(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(payload) });
}

afterEach(() => vi.restoreAllMocks());

describe('CityDescription', () => {
  it('renders nothing until data arrives', () => {
    vi.stubGlobal('fetch', mockCity(null));
    const { container } = render(<CityDescription city="Paris" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the Wikipedia extract once loaded', async () => {
    vi.stubGlobal('fetch', mockCity({ extract: 'Paris is the capital of France.', url: 'https://en.wikipedia.org/wiki/Paris' }));
    render(<CityDescription city="Paris" />);
    await waitFor(() => {
      expect(screen.getByText(/Paris is the capital of France/)).toBeInTheDocument();
    });
  });

  it('truncates long extracts with an ellipsis', async () => {
    const long = 'A'.repeat(300);
    vi.stubGlobal('fetch', mockCity({ extract: long }));
    render(<CityDescription city="Tokyo" />);
    await waitFor(() => {
      const node = screen.getByText(/A+\.\.\.$/);
      expect(node.textContent!.length).toBeLessThan(300);
    });
  });

  it('renders nothing when the API has no extract', async () => {
    vi.stubGlobal('fetch', mockCity({}));
    const { container } = render(<CityDescription city="Nowhere" />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});
