import { describe, expect, it } from 'vitest';
import { validWebhookUrl } from '@/lib/webhook-url';

describe('webhook URL validation', () => {
  it('accepts HTTPS webhook URLs without credentials', () => {
    expect(validWebhookUrl('https://alerts.example.com/hook#fragment')).toBe('https://alerts.example.com/hook');
  });

  it('rejects embedded credentials in webhook URLs', () => {
    expect(validWebhookUrl('https://user:pass@alerts.example.com/hook')).toBeNull();
  });

  it('allows localhost HTTP only outside production', () => {
    expect(validWebhookUrl('http://localhost:8787/hook', {
      env: { NODE_ENV: 'development' },
    })).toBe('http://localhost:8787/hook');
    expect(validWebhookUrl('http://127.0.0.1:8787/hook', {
      env: { NODE_ENV: 'development' },
    })).toBe('http://127.0.0.1:8787/hook');
    expect(validWebhookUrl('http://localhost:8787/hook', {
      env: { NODE_ENV: 'production' },
    })).toBeNull();
  });

  it('rejects local and private HTTPS destinations', () => {
    for (const destination of [
      'https://localhost/hook',
      'https://localhost./hook',
      'https://worker.localhost/hook',
      'https://0x7f000001/hook',
      'https://2130706433/hook',
      'https://0177.0.0.1/hook',
      'https://127.1/hook',
      'https://127.0.0.1/hook',
      'https://10.0.0.5/hook',
      'https://100.64.0.1/hook',
      'https://169.254.1.1/hook',
      'https://172.16.0.1/hook',
      'https://172.31.255.255/hook',
      'https://192.168.1.20/hook',
      'https://198.18.0.1/hook',
      'https://[::]/hook',
      'https://[::1]/hook',
      'https://[::ffff:127.0.0.1]/hook',
      'https://[fc00::1]/hook',
      'https://[fd00::1]/hook',
      'https://[fe80::1]/hook',
      'https://[fe90::1]/hook',
      'https://[fea0::1]/hook',
      'https://[feb0::1]/hook',
    ]) {
      expect(validWebhookUrl(destination, {
        env: { NODE_ENV: 'production' },
      })).toBeNull();
    }
  });

  it('allows local HTTP hosts with a trailing dot only outside production', () => {
    expect(validWebhookUrl('http://localhost.:8787/hook', {
      env: { NODE_ENV: 'development' },
    })).toBe('http://localhost.:8787/hook');
    expect(validWebhookUrl('http://service.localhost.:8787/hook', {
      env: { NODE_ENV: 'development' },
    })).toBe('http://service.localhost.:8787/hook');
  });

  it('rejects malformed numeric webhook hosts without treating them as local overrides', () => {
    expect(validWebhookUrl('not a url')).toBeNull();
    expect(validWebhookUrl('https://999.0.0.1/hook')).toBeNull();
  });

  it('rejects non-localhost HTTP destinations', () => {
    expect(validWebhookUrl('http://alerts.example.com/hook', {
      env: { NODE_ENV: 'development' },
    })).toBeNull();
  });
});
