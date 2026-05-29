// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  FAQPageJsonLd,
  HotelOfferJsonLd,
  SearchActionJsonLd,
  OrganizationJsonLd,
} from '@/components/SchemaOrg';

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent || '{}');
}

describe('FAQPageJsonLd', () => {
  it('emits FAQPage schema with questions and answers', () => {
    const { container } = render(
      <FAQPageJsonLd
        items={[
          { question: 'Is it free?', answer: 'Yes, completely free.' },
          { question: 'How does it work?', answer: 'We compare prices.' },
        ]}
      />
    );
    const schema = getJsonLd(container);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].name).toBe('Is it free?');
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('Yes, completely free.');
  });
});

describe('HotelOfferJsonLd', () => {
  it('emits LodgingBusiness with Offer schema', () => {
    const { container } = render(
      <HotelOfferJsonLd
        hotelName="Le Meurice"
        city="Paris"
        country="France"
        image="/img.jpg"
        pricePerNight={350}
        currency="USD"
        provider="Booking.com"
        url="https://booking.com/hotel/123"
      />
    );
    const schema = getJsonLd(container);
    expect(schema['@type']).toBe('LodgingBusiness');
    expect(schema.name).toBe('Le Meurice');
    expect(schema.offers['@type']).toBe('Offer');
    expect(schema.offers.price).toBe(350);
    expect(schema.offers.priceCurrency).toBe('USD');
    expect(schema.offers.seller.name).toBe('Booking.com');
  });

  it('returns null when url is empty', () => {
    const { container } = render(
      <HotelOfferJsonLd
        hotelName="Test"
        city="X"
        country="Y"
        image="/img.jpg"
        pricePerNight={100}
        currency="USD"
        provider="P"
        url=""
      />
    );
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('SearchActionJsonLd', () => {
  it('emits WebSite with SearchAction', () => {
    const { container } = render(
      <SearchActionJsonLd searchUrl="https://svbooking.com" />
    );
    const schema = getJsonLd(container);
    expect(schema['@type']).toBe('WebSite');
    expect(schema.url).toBe('https://svbooking.com');
    expect(schema.potentialAction['@type']).toBe('SearchAction');
    expect(schema.potentialAction.target.urlTemplate).toContain('/search?city=');
  });
});

describe('OrganizationJsonLd', () => {
  it('emits Organization schema', () => {
    const { container } = render(<OrganizationJsonLd />);
    const schema = getJsonLd(container);
    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe('SV Booking');
    expect(schema.url).toBe('https://svbooking.com');
    expect(schema.contactPoint['@type']).toBe('ContactPoint');
  });
});
