import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAffiliateUrl, hasAffiliateConfig, getConfiguredProviders, isAllowedProviderUrl } from '@/lib/affiliate';

describe('affiliate', () => {
  beforeEach(() => {
    // Reset env for each test
    vi.stubEnv('BOOKING_AFFILIATE_ID', '');
    vi.stubEnv('EXPEDIA_AFFILIATE_ID', '');
    vi.stubEnv('HOTELS_AFFILIATE_TAG', '');
    vi.stubEnv('AGODA_AFFILIATE_ID', '');
    vi.stubEnv('TRIP_AFFILIATE_ID', '');
    vi.stubEnv('VIO_AFFILIATE_ID', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getAffiliateUrl', () => {
    it('returns URL unchanged for unknown provider', () => {
      const url = 'https://www.booking.com/hotel/us/plaza.html';
      expect(getAffiliateUrl('UnknownOTA', url)).toBe(url);
    });

    it('returns URL unchanged when no env var is set', () => {
      const url = 'https://www.booking.com/hotel/il/hilton-tel-aviv.html';
      expect(getAffiliateUrl('Booking.com', url)).toBe(url);
    });

    it('adds Booking.com affiliate ID', () => {
      vi.stubEnv('BOOKING_AFFILIATE_ID', '12345');
      const url = 'https://www.booking.com/hotel/il/hilton-tel-aviv.html';
      const result = getAffiliateUrl('Booking.com', url);
      expect(result).toContain('aid=12345');
      expect(result).toContain('utm_source=svbooking');
      expect(result).toContain('utm_medium=referral');
    });

    it('adds Expedia affiliate ID', () => {
      vi.stubEnv('EXPEDIA_AFFILIATE_ID', 'exp-123');
      const url = 'https://www.expedia.com/hotel/123';
      const result = getAffiliateUrl('Expedia', url);
      expect(result).toContain('affcid=exp-123');
    });

    it('handles URLs with existing query params', () => {
      vi.stubEnv('BOOKING_AFFILIATE_ID', '99999');
      const url = 'https://www.booking.com/hotel?checkin=2025-06-01';
      const result = getAffiliateUrl('Booking.com', url);
      expect(result).toContain('checkin=2025-06-01');
      expect(result).toContain('aid=99999');
    });

    it('leaves invalid URLs unchanged instead of appending tracking params', () => {
      vi.stubEnv('BOOKING_AFFILIATE_ID', '555');
      const url = 'not-a-valid-url';
      const result = getAffiliateUrl('Booking.com', url);
      expect(result).toBe(url);
    });

    it('leaves non-HTTPS URLs unchanged', () => {
      vi.stubEnv('BOOKING_AFFILIATE_ID', '555');
      const url = 'http://www.booking.com/hotel/il/hilton-tel-aviv.html';
      const result = getAffiliateUrl('Booking.com', url);
      expect(result).toBe(url);
    });
  });

  describe('isAllowedProviderUrl', () => {
    it('allows HTTPS provider domains only', () => {
      expect(isAllowedProviderUrl('Booking.com', 'https://www.booking.com/hotel/il/hilton-tel-aviv.html')).toBe(true);
      expect(isAllowedProviderUrl('UnknownOTA', 'https://www.booking.com/hotel/il/hilton-tel-aviv.html')).toBe(false);
      expect(isAllowedProviderUrl('Booking.com', 'http://www.booking.com/hotel/il/hilton-tel-aviv.html')).toBe(false);
      expect(isAllowedProviderUrl('Booking.com', 'https://evil-booking.com/hotel')).toBe(false);
    });
  });

  describe('hasAffiliateConfig', () => {
    it('returns false when no env vars are set', () => {
      expect(hasAffiliateConfig()).toBe(false);
    });

    it('returns true when at least one env var is set', () => {
      vi.stubEnv('BOOKING_AFFILIATE_ID', 'test');
      expect(hasAffiliateConfig()).toBe(true);
    });
  });

  describe('getConfiguredProviders', () => {
    it('returns empty array when no env vars set', () => {
      expect(getConfiguredProviders()).toEqual([]);
    });

    it('lists configured providers', () => {
      vi.stubEnv('BOOKING_AFFILIATE_ID', 'abc');
      vi.stubEnv('AGODA_AFFILIATE_ID', 'def');
      const providers = getConfiguredProviders();
      expect(providers).toContain('Booking.com');
      expect(providers).toContain('Agoda.com');
      expect(providers).not.toContain('Expedia');
    });
  });
});
