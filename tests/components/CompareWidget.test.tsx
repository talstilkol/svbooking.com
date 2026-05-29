// @vitest-environment jsdom
import { render, screen, renderHook, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Deterministic storage mock (avoids Node 22 built-in localStorage conflict)
const mockStore: Record<string, unknown> = {};
vi.mock('@/lib/local-storage-keys', () => ({
  LOCAL_STORAGE_KEYS: { compareList: 'sv-compare-list' },
  readLocalStorageJsonWithFallback: (key: string, _f: unknown, fallback: unknown) =>
    mockStore[key] ?? fallback,
  writeLocalStorageJson: (key: string, value: unknown) => {
    mockStore[key] = value;
  },
}));

import CompareWidget, { useCompareList } from '@/components/CompareWidget';

const HOTEL_A = { hotelKey: 'g1-d1', name: 'Hotel A', city: 'Paris', image: '/a.jpg' };
const HOTEL_B = { hotelKey: 'g1-d2', name: 'Hotel B', city: 'Tokyo', image: '/b.jpg' };

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
});

describe('useCompareList', () => {
  it('adds an item and reports it in the list', async () => {
    const { result } = renderHook(() => useCompareList());
    let added = false;
    act(() => {
      added = result.current.add(HOTEL_A);
    });
    expect(added).toBe(true);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.isInList('g1-d1')).toBe(true);
  });

  it('rejects duplicate items', () => {
    const { result } = renderHook(() => useCompareList());
    act(() => { result.current.add(HOTEL_A); });
    let secondAdd = true;
    act(() => { secondAdd = result.current.add(HOTEL_A); });
    expect(secondAdd).toBe(false);
    expect(result.current.items).toHaveLength(1);
  });

  it('caps the list at 4 items', () => {
    const { result } = renderHook(() => useCompareList());
    // Each add must be in its own act() so the hook re-renders and the next
    // add() reads the updated items list (add() closes over the current render).
    for (const key of ['k1', 'k2', 'k3', 'k4']) {
      act(() => { result.current.add({ ...HOTEL_A, hotelKey: key }); });
    }
    expect(result.current.items).toHaveLength(4);
    expect(result.current.isFull).toBe(true);

    let fifthAdd = true;
    act(() => { fifthAdd = result.current.add({ ...HOTEL_A, hotelKey: 'k5' }); });
    expect(fifthAdd).toBe(false);
    expect(result.current.items).toHaveLength(4);
  });

  it('removes and clears items', () => {
    const { result } = renderHook(() => useCompareList());
    act(() => { result.current.add(HOTEL_A); });
    act(() => { result.current.add(HOTEL_B); });
    expect(result.current.items).toHaveLength(2);
    act(() => { result.current.remove('g1-d1'); });
    expect(result.current.items).toHaveLength(1);
    act(() => { result.current.clear(); });
    expect(result.current.items).toHaveLength(0);
  });
});

describe('CompareWidget', () => {
  it('renders nothing when the compare list is empty', () => {
    const { container } = render(<CompareWidget />);
    expect(container.firstChild).toBeNull();
  });

  it('renders seeded items with a count and compare link', async () => {
    mockStore['sv-compare-list'] = [HOTEL_A, HOTEL_B];
    render(<CompareWidget />);
    await waitFor(() => {
      expect(screen.getByText(/Compare \(2\/4\)/)).toBeInTheDocument();
    });
    expect(screen.getByText('Hotel A')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compare Now/i })).toHaveAttribute(
      'href',
      '/compare-hotels?hotels=g1-d1,g1-d2'
    );
  });

  it('removes an item when its remove button is clicked', async () => {
    mockStore['sv-compare-list'] = [HOTEL_A, HOTEL_B];
    const user = userEvent.setup();
    render(<CompareWidget />);
    await waitFor(() => expect(screen.getByText('Hotel A')).toBeInTheDocument());
    await user.click(screen.getByLabelText('Remove Hotel A from compare'));
    expect(screen.queryByText('Hotel A')).toBeNull();
  });
});
