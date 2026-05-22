import { kv } from './kv';
import { hashId } from './utils/hashId';
import { RETENTION_SECONDS } from './data-retention';

const TTL_SECONDS = RETENTION_SECONDS.priceAccuracyEvents;
const MAX_DAILY_OBSERVATIONS = 1000;
const MAX_DAILY_MISMATCHES = 500;

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function recordPriceObservation({
  hotelKey,
  provider,
  quotedTotal,
  currency = 'USD',
  taxesIncluded = null,
  source = 'click',
}) {
  const observedAt = new Date().toISOString();
  const date = todayIso();
  const key = `price:observations:${date}`;
  const existing = (await kv.get(key)) || [];
  const observation = {
    id: hashId('price-observation', observedAt, hotelKey || '', provider || '', quotedTotal || '', currency, source),
    observedAt,
    hotelKey: hotelKey || 'unknown',
    provider: provider || 'unknown',
    quotedTotal: toNumberOrNull(quotedTotal),
    currency,
    taxesIncluded,
    source,
  };

  const next = [observation, ...existing].slice(0, MAX_DAILY_OBSERVATIONS);
  await kv.setWithTTL(key, next, TTL_SECONDS);
  return observation;
}

export async function recordPriceMismatch({
  hotelKey,
  provider,
  quotedTotal,
  observedTotal,
  currency = 'USD',
  taxesIncluded = null,
  source = 'user-report',
}) {
  const reportedAt = new Date().toISOString();
  const date = todayIso();
  const key = `price:mismatches:${date}`;
  const existing = (await kv.get(key)) || [];
  const mismatch = {
    id: hashId('price-mismatch', reportedAt, hotelKey || '', provider || '', quotedTotal || '', observedTotal || '', currency, source),
    reportedAt,
    hotelKey: hotelKey || 'unknown',
    provider: provider || 'unknown',
    quotedTotal: toNumberOrNull(quotedTotal),
    observedTotal: toNumberOrNull(observedTotal),
    currency,
    taxesIncluded,
    source,
  };

  const next = [mismatch, ...existing].slice(0, MAX_DAILY_MISMATCHES);
  await kv.setWithTTL(key, next, TTL_SECONDS);
  return mismatch;
}

function dayOffsetIso(offset) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().split('T')[0];
}

export async function getPriceAccuracyMetrics({ days = 7 } = {}) {
  const safeDays = Math.max(1, Math.min(Number(days) || 7, 30));
  const byProvider = {};
  let observations = 0;
  let mismatches = 0;

  for (let i = 0; i < safeDays; i++) {
    const day = dayOffsetIso(i);
    const observed = (await kv.get(`price:observations:${day}`)) || [];
    const reported = (await kv.get(`price:mismatches:${day}`)) || [];

    for (const entry of observed) {
      const provider = entry.provider || 'unknown';
      byProvider[provider] ||= { observations: 0, mismatches: 0, mismatchRate: null };
      byProvider[provider].observations++;
      observations++;
    }

    for (const entry of reported) {
      const provider = entry.provider || 'unknown';
      byProvider[provider] ||= { observations: 0, mismatches: 0, mismatchRate: null };
      byProvider[provider].mismatches++;
      mismatches++;
    }
  }

  for (const stats of Object.values(byProvider)) {
    stats.mismatchRate = stats.observations > 0 ? stats.mismatches / stats.observations : null;
  }

  return {
    days: safeDays,
    observations,
    mismatches,
    mismatchRate: observations > 0 ? mismatches / observations : null,
    byProvider,
  };
}
