// JSON-LD structured data component for SEO
import { serializeJsonLd } from '@/lib/utils/jsonLd';

interface LodgingJsonLdProps {
  name: string;
  city: string;
  country: string;
  image: string;
  price?: number;
  currency?: string;
}

export function LodgingJsonLd({ name, city, country, image, price, currency }: LodgingJsonLdProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name,
    image,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: country,
    },
  };
  if (price && currency) {
    schema.priceRange = `${currency} ${price}`;
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}

// WebsiteJsonLd removed — replaced by SearchActionJsonLd in SchemaOrg.tsx to avoid duplicate @type:WebSite schemas
