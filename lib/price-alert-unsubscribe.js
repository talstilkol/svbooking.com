import { createHmac, timingSafeEqual } from 'node:crypto';
import { isEnvConfigured } from './env-config.mjs';

const TOKEN_PREFIX = 'u_';
const TOKEN_HEX_LENGTH = 32;

function unsubscribeSecret(env = process.env) {
  return env.PRICE_ALERT_UNSUBSCRIBE_SECRET || '';
}

export function isPriceAlertUnsubscribeConfigured(env = process.env) {
  return isEnvConfigured(env, 'PRICE_ALERT_UNSUBSCRIBE_SECRET');
}

export function createPriceAlertUnsubscribeToken({ uid, alertId }, env = process.env) {
  const secret = unsubscribeSecret(env);
  if (!isPriceAlertUnsubscribeConfigured(env) || !uid || !alertId) return null;

  const digest = createHmac('sha256', secret)
    .update(String(uid))
    .update(':')
    .update(String(alertId))
    .digest('hex')
    .slice(0, TOKEN_HEX_LENGTH);

  return `${TOKEN_PREFIX}${digest}`;
}

export function validPriceAlertUnsubscribeToken(token) {
  return typeof token === 'string' && new RegExp(`^${TOKEN_PREFIX}[0-9a-f]{${TOKEN_HEX_LENGTH}}$`).test(token)
    ? token
    : null;
}

export function matchesPriceAlertUnsubscribeToken({ token, uid, alertId }, env = process.env) {
  const expected = createPriceAlertUnsubscribeToken({ uid, alertId }, env);
  const candidate = validPriceAlertUnsubscribeToken(token);
  if (!expected || !candidate || expected.length !== candidate.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
}

export function matchesPriceAlertStoredUnsubscribeToken(storedToken, candidateToken) {
  const stored = validPriceAlertUnsubscribeToken(storedToken);
  const candidate = validPriceAlertUnsubscribeToken(candidateToken);
  if (!stored || !candidate || stored.length !== candidate.length) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(candidate));
}
