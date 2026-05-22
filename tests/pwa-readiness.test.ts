import { describe, expect, it } from 'vitest';
import { getPwaReadiness, isPushConfigured } from '@/lib/pwa-readiness';

describe('PWA readiness', () => {
  it('reports installable offline shell without requiring fake push state', () => {
    const readiness = getPwaReadiness({ env: {} });

    expect(readiness.installable).toBe(true);
    expect(readiness.status).toBe('installable-offline-shell');
    expect(readiness.serviceWorker.path).toBe('/sw.js');
    expect(readiness.serviceWorker.offlineFallback).toBe('/offline');
    expect(readiness.serviceWorker.pushHandler).toBe(true);
    expect(readiness.offline.livePrices).toBe('network-required');
    expect(readiness.push.status).toBe('not-configured');
    expect(readiness.push.requiresUserPermission).toBe(true);
    expect(readiness.push.delivery).toBe('disabled-without-keys');
    expect(readiness.gaps[0]).toContain('Push notification keys are not configured');
    expect(isPushConfigured({})).toBe(false);
  });

  it('marks push readiness only when both public and private push keys exist', () => {
    expect(isPushConfigured({ NEXT_PUBLIC_PUSH_PUBLIC_KEY: 'public-key' })).toBe(false);
    expect(isPushConfigured({
      NEXT_PUBLIC_PUSH_PUBLIC_KEY: 'public-key',
      PUSH_PRIVATE_KEY: 'private-key',
    })).toBe(true);

    const readiness = getPwaReadiness({
      env: {
        NEXT_PUBLIC_PUSH_PUBLIC_KEY: 'public-key',
        PUSH_PRIVATE_KEY: 'private-key',
      },
    });

    expect(readiness.status).toBe('push-ready');
    expect(readiness.push.configured).toBe(true);
    expect(readiness.push.status).toBe('keys-configured');
    expect(readiness.push.delivery).toBe('service-worker-handler-ready');
    expect(readiness.push.requiresUserPermission).toBe(true);
    expect(JSON.stringify(readiness)).not.toContain('private-key');
  });
});
