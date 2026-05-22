import type { MetadataRoute } from 'next';
import { HOTELS, listCities } from '@/lib/hotels-catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';
  const lastReviewedAt = new Date('2026-05-14T00:00:00.000Z');

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: lastReviewedAt, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified: lastReviewedAt, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: lastReviewedAt, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/compare-hotels`, lastModified: lastReviewedAt, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/deals`, lastModified: lastReviewedAt, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/explore`, lastModified: lastReviewedAt, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: lastReviewedAt, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: lastReviewedAt, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: lastReviewedAt, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: lastReviewedAt, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Hotel detail pages — one per catalog hotel
  const hotelPages: MetadataRoute.Sitemap = HOTELS.map((hotel) => ({
    url: `${baseUrl}/hotel/${hotel.hotelKey}`,
    lastModified: lastReviewedAt,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // City landing pages
  const cityPages: MetadataRoute.Sitemap = listCities().map((city) => ({
    url: `${baseUrl}/city/${encodeURIComponent(city)}`,
    lastModified: lastReviewedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages, ...hotelPages];
}
