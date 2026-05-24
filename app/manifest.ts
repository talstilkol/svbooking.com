import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SV Booking - Hotel Price Comparison',
    short_name: 'SV Booking',
    description: 'Compare provider-returned hotel prices when rates are available',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0f9ff',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    categories: ['travel', 'shopping'],
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
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/api/og?title=Compare+Hotel+Prices&subtitle=Find+the+best+rates+across+providers',
        sizes: '1200x630',
        type: 'image/png',
        form_factor: 'wide',
        label: 'SV Booking hotel price comparison',
      },
    ],
  };
}
