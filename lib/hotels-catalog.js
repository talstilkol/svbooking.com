// Curated hotel catalog with TripAdvisor hotel keys (format: g{locationId}-d{hotelId})
// Used with Xotelo API for real-time price comparison across OTAs.
// Keys can be found from TripAdvisor URLs:
//   https://www.tripadvisor.com/Hotel_Review-g{LOCATION}-d{HOTEL}-Reviews-...

// Images: city/destination photos from Unsplash (not fake hotel photos)
const CITY_IMAGES = {
  'Tel Aviv': 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80',
  'Jerusalem': 'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=800&q=80',
  'Phuket': 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80',
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
  'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
  'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
  'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80';

export const HOTELS = [
  // Tel Aviv
  {
    hotelKey: 'g293984-d301497',
    name: 'Hilton Tel Aviv',
    city: 'Tel Aviv',
    country: 'Israel',
    image: CITY_IMAGES['Tel Aviv'],
  },
  {
    hotelKey: 'g293984-d301984',
    name: 'Dan Tel Aviv',
    city: 'Tel Aviv',
    country: 'Israel',
    image: CITY_IMAGES['Tel Aviv'],
  },
  // Jerusalem
  {
    hotelKey: 'g293983-d320692',
    name: 'King David Hotel',
    city: 'Jerusalem',
    country: 'Israel',
    image: CITY_IMAGES['Jerusalem'],
  },
  // Phuket
  {
    hotelKey: 'g297930-d305178',
    name: 'Patong Beach Hotel',
    city: 'Phuket',
    country: 'Thailand',
    image: CITY_IMAGES['Phuket'],
  },
  // Paris
  {
    hotelKey: 'g187147-d188728',
    name: 'Le Meurice',
    city: 'Paris',
    country: 'France',
    image: CITY_IMAGES['Paris'],
  },
  {
    hotelKey: 'g187147-d197539',
    name: 'Hotel Plaza Athenee',
    city: 'Paris',
    country: 'France',
    image: CITY_IMAGES['Paris'],
  },
  // London
  {
    hotelKey: 'g186338-d193089',
    name: 'The Savoy',
    city: 'London',
    country: 'UK',
    image: CITY_IMAGES['London'],
  },
  {
    hotelKey: 'g186338-d187591',
    name: 'The Ritz London',
    city: 'London',
    country: 'UK',
    image: CITY_IMAGES['London'],
  },
  // New York
  {
    hotelKey: 'g60763-d99762',
    name: 'The Plaza',
    city: 'New York',
    country: 'USA',
    image: CITY_IMAGES['New York'],
  },
  {
    hotelKey: 'g60763-d224075',
    name: 'The Standard High Line',
    city: 'New York',
    country: 'USA',
    image: CITY_IMAGES['New York'],
  },
  // Tokyo
  {
    hotelKey: 'g1066456-d307653',
    name: 'Mandarin Oriental Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    image: CITY_IMAGES['Tokyo'],
  },
  // Rome
  {
    hotelKey: 'g187791-d232380',
    name: 'Palazzo Manfredi',
    city: 'Rome',
    country: 'Italy',
    image: CITY_IMAGES['Rome'],
  },
  // Barcelona
  {
    hotelKey: 'g187497-d228735',
    name: 'Hotel Arts Barcelona',
    city: 'Barcelona',
    country: 'Spain',
    image: CITY_IMAGES['Barcelona'],
  },
  // Dubai
  {
    hotelKey: 'g295424-d302013',
    name: 'Burj Al Arab Jumeirah',
    city: 'Dubai',
    country: 'UAE',
    image: CITY_IMAGES['Dubai'],
  },
  {
    hotelKey: 'g295424-d300110',
    name: 'JW Marriott Marquis Dubai',
    city: 'Dubai',
    country: 'UAE',
    image: CITY_IMAGES['Dubai'],
  },
];

export function listCities() {
  return Array.from(new Set(HOTELS.map((h) => h.city))).sort();
}

export function listCountries() {
  return Array.from(new Set(HOTELS.map((h) => h.country))).sort();
}

export function getHotelsByCity(city) {
  if (!city) return HOTELS;
  const norm = city.trim().toLowerCase();
  return HOTELS.filter((h) => h.city.toLowerCase() === norm);
}

export function getHotelsByCountry(country) {
  if (!country) return HOTELS;
  const norm = country.trim().toLowerCase();
  return HOTELS.filter((h) => h.country.toLowerCase() === norm);
}

export function getHotelsByCities(cities) {
  if (!cities || cities.length === 0) return HOTELS;
  const normCities = cities.map((c) => c.trim().toLowerCase());
  return HOTELS.filter((h) => normCities.includes(h.city.toLowerCase()));
}

export function findHotel(hotelKey) {
  return HOTELS.find((h) => h.hotelKey === hotelKey) || null;
}
