// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LodgingJsonLd, BreadcrumbJsonLd, ItemListJsonLd } from '@/components/JsonLd';

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent || '{}');
}

describe('LodgingJsonLd', () => {
  it('emits LodgingBusiness schema with name and address', () => {
    const { container } = render(
      <LodgingJsonLd name="Le Meurice" city="Paris" country="France" image="https://example.com/img.jpg" />
    );
    const schema = getJsonLd(container);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('LodgingBusiness');
    expect(schema.name).toBe('Le Meurice');
    expect(schema.address.addressLocality).toBe('Paris');
    expect(schema.address.addressCountry).toBe('France');
    expect(schema.image).toBe('https://example.com/img.jpg');
  });

  it('includes priceRange when price and currency are given', () => {
    const { container } = render(
      <LodgingJsonLd name="Test Hotel" city="Tokyo" country="Japan" image="/img.jpg" price={200} currency="USD" />
    );
    const schema = getJsonLd(container);
    expect(schema.priceRange).toBe('USD 200');
  });

  it('omits priceRange when price is not given', () => {
    const { container } = render(
      <LodgingJsonLd name="Test Hotel" city="Tokyo" country="Japan" image="/img.jpg" />
    );
    const schema = getJsonLd(container);
    expect(schema.priceRange).toBeUndefined();
  });
});

describe('BreadcrumbJsonLd', () => {
  it('emits BreadcrumbList with correct positions', () => {
    const { container } = render(
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://svbooking.com' },
        { name: 'Search', url: 'https://svbooking.com/search' },
        { name: 'Paris', url: 'https://svbooking.com/search?city=Paris' },
      ]} />
    );
    const schema = getJsonLd(container);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[0].name).toBe('Home');
    expect(schema.itemListElement[2].position).toBe(3);
    expect(schema.itemListElement[2].name).toBe('Paris');
  });
});

describe('ItemListJsonLd', () => {
  it('emits ItemList with hotel items', () => {
    const { container } = render(
      <ItemListJsonLd
        name="Hotels in Paris"
        items={[
          { name: 'Le Meurice', url: 'https://svbooking.com/hotel/g187147-d188728', image: '/img1.jpg' },
          { name: 'Ritz Paris', url: 'https://svbooking.com/hotel/g187147-d12345' },
        ]}
      />
    );
    const schema = getJsonLd(container);
    expect(schema['@type']).toBe('ItemList');
    expect(schema.name).toBe('Hotels in Paris');
    expect(schema.numberOfItems).toBe(2);
    expect(schema.itemListElement[0].name).toBe('Le Meurice');
    expect(schema.itemListElement[0].image).toBe('/img1.jpg');
    expect(schema.itemListElement[1].image).toBeUndefined();
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
  });
});
