import type { MetadataRoute } from 'next';
import { HOTELS, listCities } from '@/lib/hotels-catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://svbooking.com';
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/explore`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/favorites`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/trips`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Hotel detail pages — one per catalog hotel
  const hotelPages: MetadataRoute.Sitemap = HOTELS.map((hotel) => ({
    url: `${baseUrl}/hotel/${hotel.hotelKey}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // City landing pages
  const cityPages: MetadataRoute.Sitemap = listCities().map((city) => ({
    url: `${baseUrl}/city/${encodeURIComponent(city)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages, ...hotelPages];
}
