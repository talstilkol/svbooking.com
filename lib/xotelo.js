// Xotelo - Free hotel prices API (no auth required)
// Returns real prices from Booking.com, Expedia, Hotels.com, Agoda, Vio, etc.
// Docs: https://xotelo.com/

const XOTELO_BASE = 'https://data.xotelo.com/api';

export async function getRates({ hotelKey, checkIn, checkOut, currency = 'USD' }) {
  const url = new URL(`${XOTELO_BASE}/rates`);
  url.searchParams.set('hotel_key', hotelKey);
  url.searchParams.set('chk_in', checkIn);
  url.searchParams.set('chk_out', checkOut);
  if (currency) url.searchParams.set('currency', currency);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Xotelo HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message;
    throw new Error(`Xotelo error: ${msg}`);
  }
  return data.result;
}

export async function getHeatmap({ hotelKey, checkOut }) {
  const url = new URL(`${XOTELO_BASE}/heatmap`);
  url.searchParams.set('hotel_key', hotelKey);
  url.searchParams.set('chk_out', checkOut);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Xotelo HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message;
    throw new Error(`Xotelo error: ${msg}`);
  }
  return data.result;
}
