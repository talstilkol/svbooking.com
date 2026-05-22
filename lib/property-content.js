import { findHotel } from './hotels-catalog';

function unavailableSection(kind) {
  return {
    available: false,
    status: 'unavailable',
    source: null,
    lastUpdatedAt: null,
    items: [],
    reason: `Verified ${kind} data is unavailable for this property.`,
  };
}

export function getPropertyContent(hotelKey) {
  const hotel = findHotel(hotelKey);
  if (!hotel) return null;

  return {
    hotelKey,
    hotelName: hotel.name,
    city: hotel.city,
    country: hotel.country,
    source: 'catalog',
    lastUpdatedAt: null,
    sections: {
      amenities: unavailableSection('amenity'),
      policies: unavailableSection('policy'),
      rooms: unavailableSection('room'),
      photos: unavailableSection('photo provenance'),
      starRating: {
        available: false,
        status: 'unavailable',
        source: null,
        value: null,
        lastUpdatedAt: null,
        reason: 'Verified official star-rating data is unavailable for this property.',
      },
      cancellation: unavailableSection('cancellation'),
      taxesAndFees: unavailableSection('tax and fee'),
    },
  };
}
