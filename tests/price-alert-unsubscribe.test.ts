import { describe, expect, it } from 'vitest';
import {
  createPriceAlertUnsubscribeToken,
  isPriceAlertUnsubscribeConfigured,
  matchesPriceAlertStoredUnsubscribeToken,
  matchesPriceAlertUnsubscribeToken,
  validPriceAlertUnsubscribeToken,
} from '@/lib/price-alert-unsubscribe';

describe('price alert unsubscribe tokens', () => {
  it('are deterministic and secret-backed without randomness', () => {
    const env = { PRICE_ALERT_UNSUBSCRIBE_SECRET: 'unsubscribe-secret' } as unknown as NodeJS.ProcessEnv;
    const input = { uid: 'user_1', alertId: 'h_alert' };

    const first = createPriceAlertUnsubscribeToken(input, env);
    const second = createPriceAlertUnsubscribeToken(input, env);

    expect(first).toBe(second);
    expect(first).toMatch(/^u_[0-9a-f]{32}$/);
    expect(matchesPriceAlertUnsubscribeToken({ token: first, ...input }, env)).toBe(true);
    expect(matchesPriceAlertUnsubscribeToken({ token: first, uid: 'user_2', alertId: 'h_alert' }, env)).toBe(false);
  });

  it('compares stored unsubscribe tokens with timing-safe equality', () => {
    const stored = 'u_0123456789abcdef0123456789abcdef';
    const different = 'u_fedcba9876543210fedcba9876543210';

    expect(matchesPriceAlertStoredUnsubscribeToken(stored, stored)).toBe(true);
    expect(matchesPriceAlertStoredUnsubscribeToken(stored, different)).toBe(false);
    expect(matchesPriceAlertStoredUnsubscribeToken(stored, 'bad-token')).toBe(false);
    expect(matchesPriceAlertStoredUnsubscribeToken(null, stored)).toBe(false);
  });

  it('stays unavailable without a configured secret', () => {
    expect(isPriceAlertUnsubscribeConfigured({} as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(createPriceAlertUnsubscribeToken({ uid: 'user_1', alertId: 'h_alert' }, {} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(validPriceAlertUnsubscribeToken('bad-token')).toBeNull();
  });
});
