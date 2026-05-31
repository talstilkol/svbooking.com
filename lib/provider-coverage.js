import { kv } from '@/lib/kv';
import { findHotel, listCities, listCountries } from '@/lib/hotels-catalog';

const DATA_POLICY = 'verified-provider-observations-only';
const MAX_DAYS = 30;

function dayOffsetIso(offset) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().split('T')[0];
}

function safeDays(value) {
  return Math.max(1, Math.min(Number(value) || 7, MAX_DAYS));
}

function cleanLabel(value, fallback = 'unknown') {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

function ensureMetric(map, key, extras = {}) {
  if (!map.has(key)) {
    map.set(key, {
      key,
      observations: 0,
      hotels: new Set(),
      providers: new Set(),
      cities: new Set(),
      countries: new Set(),
      dates: new Set(),
      ...extras,
    });
  }
  return map.get(key);
}

function addObservation(metric, { hotelKey, provider, city, country, date }) {
  metric.observations += 1;
  metric.hotels.add(hotelKey);
  metric.providers.add(provider);
  metric.cities.add(city);
  metric.countries.add(country);
  metric.dates.add(date);
}

function serializeMetric(metric) {
  return {
    ...Object.fromEntries(Object.entries(metric).filter(([, value]) => !(value instanceof Set))),
    hotelCount: metric.hotels.size,
    providerCount: metric.providers.size,
    cityCount: metric.cities.size,
    countryCount: metric.countries.size,
    dateCount: metric.dates.size,
    providers: [...metric.providers].sort(),
    cities: [...metric.cities].sort(),
    countries: [...metric.countries].sort(),
    dates: [...metric.dates].sort(),
  };
}

function sortedMetrics(map) {
  return [...map.values()]
    .map(serializeMetric)
    .sort((a, b) => b.observations - a.observations || a.key.localeCompare(b.key));
}

function summarizeDate(date, observations) {
  const providers = new Set(observations.map((item) => item.provider));
  const cities = new Set(observations.map((item) => item.city));
  const countries = new Set(observations.map((item) => item.country));
  const hotels = new Set(observations.map((item) => item.hotelKey));

  return {
    date,
    observations: observations.length,
    providerCount: providers.size,
    cityCount: cities.size,
    countryCount: countries.size,
    hotelCount: hotels.size,
    providers: [...providers].sort(),
  };
}

export async function getProviderCoverageMatrix({ days = 7 } = {}) {
  const safeDayCount = safeDays(days);
  const byProvider = new Map();
  const byCountry = new Map();
  const byCity = new Map();
  const byDate = [];
  let totalObservations = 0;

  for (let offset = 0; offset < safeDayCount; offset += 1) {
    const date = dayOffsetIso(offset);
    const rawObservations = await kv.get(`price:observations:${date}`);
    const observations = Array.isArray(rawObservations) ? rawObservations : [];
    const normalizedForDate = [];

    for (const entry of observations) {
      const hotelKey = cleanLabel(entry?.hotelKey);
      const provider = cleanLabel(entry?.provider);
      const hotel = findHotel(hotelKey);
      const city = cleanLabel(hotel?.city);
      const country = cleanLabel(hotel?.country);
      const normalized = { hotelKey, provider, city, country, date };

      totalObservations += 1;
      normalizedForDate.push(normalized);

      addObservation(ensureMetric(byProvider, provider, { provider }), normalized);
      addObservation(ensureMetric(byCountry, country, { country }), normalized);
      addObservation(ensureMetric(byCity, `${country}:${city}`, { city, country }), normalized);
    }

    byDate.push(summarizeDate(date, normalizedForDate));
  }

  const observedCities = new Set([...byCity.values()].map((metric) => metric.city));
  const observedCountries = new Set([...byCountry.values()].map((metric) => metric.country));

  return {
    status: totalObservations > 0 ? 'available' : 'insufficient-data',
    dataPolicy: DATA_POLICY,
    days: safeDayCount,
    totalObservations,
    generatedAt: new Date().toISOString(),
    catalogScope: {
      cities: listCities().length,
      countries: listCountries().length,
      observedCities: observedCities.size,
      observedCountries: observedCountries.size,
      unobservedCities: Math.max(0, listCities().length - observedCities.size),
      unobservedCountries: Math.max(0, listCountries().length - observedCountries.size),
    },
    byDate,
    byProvider: sortedMetrics(byProvider),
    byCountry: sortedMetrics(byCountry),
    byCity: sortedMetrics(byCity),
  };
}
