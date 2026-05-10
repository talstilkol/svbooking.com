import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SV Booking - Hotel Price Comparison',
    short_name: 'SV Booking',
    description: 'Compare hotel prices from Booking.com, Expedia, Hotels.com, Agoda & more',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0f9ff',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
