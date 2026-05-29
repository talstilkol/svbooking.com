/**
 * Shared countdown math used by Countdown.tsx and CountdownDeal.tsx.
 * Kept as one tested util so the day/hour/minute breakdown lives in a single place.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_MINUTE = 1000 * 60;
const MS_PER_SECOND = 1000;

/**
 * Break the time between now and `target` into day/hour/minute/second parts.
 * @param {Date|string} target - target date (Date or ISO string)
 * @param {number} [now] - optional override for the current time (ms), for tests
 */
export function getTimeRemaining(target, now = Date.now()) {
  const targetMs = (target instanceof Date ? target : new Date(target)).getTime();
  const diff = targetMs - now;

  if (!Number.isFinite(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
  }

  return {
    days: Math.floor(diff / MS_PER_DAY),
    hours: Math.floor((diff / MS_PER_HOUR) % 24),
    minutes: Math.floor((diff / MS_PER_MINUTE) % 60),
    seconds: Math.floor((diff / MS_PER_SECOND) % 60),
    totalMs: diff,
    expired: false,
  };
}

/**
 * Whole days until `target`, rounded up (so "tomorrow" reads as 1, not 0).
 * Never negative.
 */
export function getDaysUntil(target, now = Date.now()) {
  const targetMs = (target instanceof Date ? target : new Date(target)).getTime();
  const diff = targetMs - now;
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}
