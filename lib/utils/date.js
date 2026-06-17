/**
 * @param {Date | string | number} [value]
 * @returns {string | null}
 */
export function toIsoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

/**
 * @param {Date | string | number} dateStr
 * @param {number} days
 * @returns {string | null}
 */
export function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/**
 * @param {Date | string | number} startDateStr
 * @param {Date | string | number} endDateStr
 * @returns {number | null}
 */
export function daysBetween(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
