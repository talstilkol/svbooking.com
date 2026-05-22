/**
 * Additional Schema.org structured data for SEO.
 * Complements the existing JsonLd.tsx (WebsiteJsonLd, LodgingJsonLd, BreadcrumbJsonLd).
 */
import { serializeJsonLd } from '@/lib/utils/jsonLd';

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageJsonLd({ items }: { items: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

interface HotelOfferProps {
  hotelName: string;
  city: string;
  country: string;
  image: string;
  pricePerNight: number;
  currency: string;
  provider: string;
  url: string;
}

export function HotelOfferJsonLd({
  hotelName,
  city,
  country,
  image,
  pricePerNight,
  currency,
  provider,
  url,
}: HotelOfferProps) {
  if (!url) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: hotelName,
    image,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: country,
    },
    offers: {
      '@type': 'Offer',
      price: pricePerNight,
      priceCurrency: currency,
      url,
      seller: {
        '@type': 'Organization',
        name: provider,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

interface SearchActionProps {
  searchUrl: string;
}

export function SearchActionJsonLd({ searchUrl }: SearchActionProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: searchUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${searchUrl}/search?city={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SV Booking',
    url: 'https://svbooking.com',
    logo: 'https://svbooking.com/icon.png',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English'],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
