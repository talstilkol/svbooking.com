import { getHeatmap, getRates } from './xotelo';

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function generateCandidateDates(checkIn, checkOut) {
  const nights = daysBetween(checkIn, checkOut);
  const candidates = { near: [], week: [], month: [] };
  const originalCheckIn = checkIn;
  const today = new Date().toISOString().split('T')[0];

  for (let offset = -30; offset <= 30; offset++) {
    if (offset === 0) continue;
    const candidateCheckIn = addDays(originalCheckIn, offset);
    const candidateCheckOut = addDays(candidateCheckIn, nights);

    if (candidateCheckIn < today) continue;

    const entry = { checkIn: candidateCheckIn, checkOut: candidateCheckOut };

    if (Math.abs(offset) <= 3) {
      candidates.near.push(entry);
    } else if (Math.abs(offset) <= 7) {
      candidates.week.push(entry);
    } else {
      candidates.month.push(entry);
    }
  }

  return candidates;
}

async function fetchWithConcurrency(tasks, concurrency = 5) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

async function getPriceForDates(hotelKey, checkIn, checkOut) {
  try {
    const result = await getRates({ hotelKey, checkIn, checkOut });
    const rates = (result?.rates || [])
      .map((r) => ({
        provider: r.name,
        total: Number(r.rate || 0) + Number(r.tax || 0),
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => a.total - b.total);

    if (rates.length === 0) return null;
    return { price: rates[0].total, provider: rates[0].provider };
  } catch {
    return null;
  }
}

export async function findCheaperDates(hotelKey, checkIn, checkOut) {
  const nights = daysBetween(checkIn, checkOut);
  const candidates = generateCandidateDates(checkIn, checkOut);

  const originalPrice = await getPriceForDates(hotelKey, checkIn, checkOut);

  const allCandidates = [
    ...candidates.near.map((c) => ({ ...c, bracket: 'near' })),
    ...candidates.week.map((c) => ({ ...c, bracket: 'week' })),
    ...candidates.month.slice(0, 10).map((c) => ({ ...c, bracket: 'month' })),
  ];

  const tasks = allCandidates.map((candidate) => () =>
    getPriceForDates(hotelKey, candidate.checkIn, candidate.checkOut).then((result) =>
      result ? { ...candidate, ...result } : null
    )
  );

  const results = await fetchWithConcurrency(tasks, 5);

  const alternatives = { near: [], week: [], month: [] };
  const basePrice = originalPrice?.price || 0;

  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const alt = result.value;

    const entry = {
      checkIn: alt.checkIn,
      checkOut: alt.checkOut,
      price: alt.price,
      provider: alt.provider,
      savings: basePrice ? Number((basePrice - alt.price).toFixed(2)) : 0,
      savingsPct: basePrice ? Math.round(((basePrice - alt.price) / basePrice) * 100) : 0,
    };

    alternatives[alt.bracket].push(entry);
  }

  for (const bracket of Object.keys(alternatives)) {
    alternatives[bracket].sort((a, b) => a.price - b.price);
  }

  const allAlternatives = [...alternatives.near, ...alternatives.week, ...alternatives.month];
  const cheapestOverall = allAlternatives.length > 0
    ? allAlternatives.reduce((min, alt) => (alt.price < min.price ? alt : min))
    : null;

  return {
    originalDates: { checkIn, checkOut, nights },
    originalPrice: originalPrice?.price || null,
    originalProvider: originalPrice?.provider || null,
    alternatives,
    cheapestOverall,
  };
}
