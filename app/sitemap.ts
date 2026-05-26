import type { MetadataRoute } from 'next';
import { HOTELS, listCities } from '@/lib/hotels-catalog';

/**
 * Sitemap for search engines.
 *
 * Only includes publicly indexable pages — excludes anything blocked by robots.txt
 * (dashboard, profile, favorites, trips, book, offline, agents).
 *
 * Uses a static build date for lastModified instead of new Date() to avoid
 * giving crawlers a signal that everything changes on every request.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';

  // Use a stable date — updated on each deploy, not per-request
  const deployDate = new Date(process.env.VERCEL_GIT_COMMIT_SHA ? Date.now() : '2026-05-26');

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: deployDate, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified: deployDate, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: deployDate, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/compare-hotels`, lastModified: deployDate, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/deals`, lastModified: deployDate, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/explore`, lastModified: deployDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: deployDate, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: deployDate, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: deployDate, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: deployDate, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Hotel detail pages — one per catalog hotel
  const hotelPages: MetadataRoute.Sitemap = HOTELS.map((hotel) => ({
    url: `${baseUrl}/hotel/${hotel.hotelKey}`,
    lastModified: deployDate,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // City landing pages
  const cityPages: MetadataRoute.Sitemap = listCities().map((city) => ({
    url: `${baseUrl}/city/${encodeURIComponent(city)}`,
    lastModified: deployDate,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages, ...hotelPages];
}
