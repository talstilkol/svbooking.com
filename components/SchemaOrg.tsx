/**
 * Additional Schema.org structured data for SEO.
 * Complements the existing JsonLd.tsx (WebsiteJsonLd, LodgingJsonLd, BreadcrumbJsonLd).
 */

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
  checkIn: string;
  checkOut: string;
  ratingValue: number;
  ratingCount: number;
}

export function HotelOfferJsonLd({
  hotelName,
  city,
  country,
  image,
  pricePerNight,
  currency,
  provider,
  checkIn,
  checkOut,
  ratingValue,
  ratingCount,
}: HotelOfferProps) {
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
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount: ratingCount,
      bestRating: 10,
      worstRating: 1,
    },
    offers: {
      '@type': 'Offer',
      price: pricePerNight,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      validFrom: checkIn,
      validThrough: checkOut,
      seller: {
        '@type': 'Organization',
        name: provider,
      },
      priceValidUntil: checkOut,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
