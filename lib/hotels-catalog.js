// Curated hotel catalog with TripAdvisor hotel keys (format: g{locationId}-d{hotelId})
// Used with Xotelo API for real-time price comparison across OTAs.

const CITY_IMAGES = {
  'Tel Aviv':    'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&q=80',
  'Jerusalem':   'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=800&q=80',
  'Phuket':      'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80',
  'Bangkok':     'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
  'Bali':        'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  'Tokyo':       'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
  'Singapore':   'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80',
  'Paris':       'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  'London':      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  'Rome':        'https://images.unsplash.com/photo-1552832230-c0197dd371b5?w=800&q=80',
  'Barcelona':   'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
  'Amsterdam':   'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80',
  'Prague':      'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80',
  'Vienna':      'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80',
  'Istanbul':    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
  'Dubai':       'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
  'New York':    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  'Miami':       'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&q=80',
  'Las Vegas':   'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800&q=80',
  'Sydney':      'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80';

function img(city) { return CITY_IMAGES[city] || DEFAULT_IMAGE; }

export const HOTELS = [
  // ── ISRAEL ──────────────────────────────────────────────
  { hotelKey: 'g293984-d301497', name: 'Hilton Tel Aviv',            city: 'Tel Aviv',   country: 'Israel',      image: img('Tel Aviv') },
  { hotelKey: 'g293984-d301984', name: 'Dan Tel Aviv',               city: 'Tel Aviv',   country: 'Israel',      image: img('Tel Aviv') },
  { hotelKey: 'g293984-d1001747',name: 'The Norman Tel Aviv',         city: 'Tel Aviv',   country: 'Israel',      image: img('Tel Aviv') },
  { hotelKey: 'g293984-d12654909',name: 'Hotel Indigo Tel Aviv',      city: 'Tel Aviv',   country: 'Israel',      image: img('Tel Aviv') },
  { hotelKey: 'g293983-d320692', name: 'King David Hotel',            city: 'Jerusalem',  country: 'Israel',      image: img('Jerusalem') },
  { hotelKey: 'g293983-d319658', name: 'Mamilla Hotel',               city: 'Jerusalem',  country: 'Israel',      image: img('Jerusalem') },

  // ── THAILAND ─────────────────────────────────────────────
  { hotelKey: 'g297930-d305178', name: 'Patong Beach Hotel',          city: 'Phuket',     country: 'Thailand',    image: img('Phuket') },
  { hotelKey: 'g297930-d300806', name: 'Anantara Layan Phuket',       city: 'Phuket',     country: 'Thailand',    image: img('Phuket') },
  { hotelKey: 'g293917-d307650', name: 'Mandarin Oriental Bangkok',   city: 'Bangkok',    country: 'Thailand',    image: img('Bangkok') },
  { hotelKey: 'g293917-d300641', name: 'Capella Bangkok',             city: 'Bangkok',    country: 'Thailand',    image: img('Bangkok') },
  { hotelKey: 'g293917-d311936', name: 'The Peninsula Bangkok',       city: 'Bangkok',    country: 'Thailand',    image: img('Bangkok') },

  // ── BALI ─────────────────────────────────────────────────
  { hotelKey: 'g297698-d300786', name: 'Four Seasons Resort Bali',    city: 'Bali',       country: 'Indonesia',   image: img('Bali') },
  { hotelKey: 'g297699-d300912', name: 'COMO Uma Canggu',             city: 'Bali',       country: 'Indonesia',   image: img('Bali') },
  { hotelKey: 'g297698-d301040', name: 'Alaya Resort Ubud',           city: 'Bali',       country: 'Indonesia',   image: img('Bali') },

  // ── JAPAN ─────────────────────────────────────────────────
  { hotelKey: 'g1066456-d307653',name: 'Mandarin Oriental Tokyo',     city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g1066456-d12211058',name:'Park Hyatt Tokyo',           city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g1066456-d320532',name: 'The Peninsula Tokyo',         city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g1066456-d306301',name: 'Aman Tokyo',                  city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },

  // ── SINGAPORE ────────────────────────────────────────────
  { hotelKey: 'g294265-d301181', name: 'Marina Bay Sands',            city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },
  { hotelKey: 'g294265-d300971', name: 'Raffles Hotel Singapore',     city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },
  { hotelKey: 'g294265-d624905', name: 'The Fullerton Hotel Singapore',city: 'Singapore', country: 'Singapore',   image: img('Singapore') },

  // ── FRANCE ───────────────────────────────────────────────
  { hotelKey: 'g187147-d188728', name: 'Le Meurice',                  city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d197539', name: 'Hotel Plaza Athenee',         city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d188630', name: 'Shangri-La Paris',            city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d264823', name: 'Hotel Costes',                city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d188729', name: 'Four Seasons Hotel George V', city: 'Paris',      country: 'France',      image: img('Paris') },

  // ── UK ───────────────────────────────────────────────────
  { hotelKey: 'g186338-d193089', name: 'The Savoy',                   city: 'London',     country: 'UK',          image: img('London') },
  { hotelKey: 'g186338-d187591', name: 'The Ritz London',             city: 'London',     country: 'UK',          image: img('London') },
  { hotelKey: 'g186338-d188616', name: "Claridge's",                  city: 'London',     country: 'UK',          image: img('London') },
  { hotelKey: 'g186338-d191299', name: 'The Dorchester',              city: 'London',     country: 'UK',          image: img('London') },
  { hotelKey: 'g186338-d188753', name: 'Rosewood London',             city: 'London',     country: 'UK',          image: img('London') },

  // ── ITALY ────────────────────────────────────────────────
  { hotelKey: 'g187791-d232380', name: 'Palazzo Manfredi',            city: 'Rome',       country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187791-d234524', name: 'Hotel de Russie',             city: 'Rome',       country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187791-d233261', name: 'Hotel Hassler Roma',          city: 'Rome',       country: 'Italy',       image: img('Rome') },

  // ── SPAIN ────────────────────────────────────────────────
  { hotelKey: 'g187497-d228735', name: 'Hotel Arts Barcelona',        city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },
  { hotelKey: 'g187497-d229027', name: 'Mandarin Oriental Barcelona', city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },
  { hotelKey: 'g187497-d231497', name: 'Cotton House Hotel',          city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },

  // ── NETHERLANDS ──────────────────────────────────────────
  { hotelKey: 'g188590-d243625', name: 'Waldorf Astoria Amsterdam',   city: 'Amsterdam',  country: 'Netherlands', image: img('Amsterdam') },
  { hotelKey: 'g188590-d261895', name: 'Pulitzer Amsterdam',          city: 'Amsterdam',  country: 'Netherlands', image: img('Amsterdam') },
  { hotelKey: 'g188590-d248399', name: 'Hotel V Nesplein',            city: 'Amsterdam',  country: 'Netherlands', image: img('Amsterdam') },

  // ── CZECH REPUBLIC ───────────────────────────────────────
  { hotelKey: 'g274707-d276532', name: 'Four Seasons Prague',         city: 'Prague',     country: 'Czech Republic', image: img('Prague') },
  { hotelKey: 'g274707-d279441', name: 'The Augustine Prague',        city: 'Prague',     country: 'Czech Republic', image: img('Prague') },
  { hotelKey: 'g274707-d279415', name: 'Mandarin Oriental Prague',    city: 'Prague',     country: 'Czech Republic', image: img('Prague') },

  // ── AUSTRIA ──────────────────────────────────────────────
  { hotelKey: 'g190454-d200973', name: 'Hotel Sacher Wien',           city: 'Vienna',     country: 'Austria',     image: img('Vienna') },
  { hotelKey: 'g190454-d7677671',name: 'The Ritz-Carlton Vienna',     city: 'Vienna',     country: 'Austria',     image: img('Vienna') },
  { hotelKey: 'g190454-d200976', name: 'Hotel Imperial Vienna',       city: 'Vienna',     country: 'Austria',     image: img('Vienna') },

  // ── TURKEY ───────────────────────────────────────────────
  { hotelKey: 'g298063-d300655', name: 'Four Seasons Istanbul Bosphorus', city: 'Istanbul', country: 'Turkey',   image: img('Istanbul') },
  { hotelKey: 'g298063-d300298', name: 'Ciragan Palace Kempinski',    city: 'Istanbul',   country: 'Turkey',     image: img('Istanbul') },
  { hotelKey: 'g298063-d300656', name: 'Four Seasons Istanbul Sultanahmet', city: 'Istanbul', country: 'Turkey', image: img('Istanbul') },

  // ── UAE ──────────────────────────────────────────────────
  { hotelKey: 'g295424-d302013', name: 'Burj Al Arab Jumeirah',       city: 'Dubai',      country: 'UAE',         image: img('Dubai') },
  { hotelKey: 'g295424-d300110', name: 'JW Marriott Marquis Dubai',   city: 'Dubai',      country: 'UAE',         image: img('Dubai') },
  { hotelKey: 'g295424-d302162', name: 'Atlantis The Palm',           city: 'Dubai',      country: 'UAE',         image: img('Dubai') },
  { hotelKey: 'g295424-d597279', name: 'One&Only Royal Mirage',       city: 'Dubai',      country: 'UAE',         image: img('Dubai') },

  // ── USA ──────────────────────────────────────────────────
  { hotelKey: 'g60763-d99762',   name: 'The Plaza New York',          city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d224075',  name: 'The Standard High Line',      city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d93510',   name: 'Four Seasons New York',       city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d99235',   name: 'The Mark Hotel',              city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g34438-d89218',   name: 'The Setai Miami Beach',       city: 'Miami',      country: 'USA',         image: img('Miami') },
  { hotelKey: 'g34438-d89211',   name: 'Faena Hotel Miami Beach',     city: 'Miami',      country: 'USA',         image: img('Miami') },
  { hotelKey: 'g45963-d87974',   name: 'Bellagio Las Vegas',          city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },
  { hotelKey: 'g45963-d1246438', name: 'ARIA Resort & Casino',        city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },

  // ── AUSTRALIA ────────────────────────────────────────────
  { hotelKey: 'g255060-d303928', name: 'Park Hyatt Sydney',           city: 'Sydney',     country: 'Australia',   image: img('Sydney') },
  { hotelKey: 'g255060-d302235', name: 'Four Seasons Hotel Sydney',   city: 'Sydney',     country: 'Australia',   image: img('Sydney') },
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

export function getHotelsByContinent(continentId) {
  // Dynamic import would create circular dependency, so inline the mapping
  const continentCountries = {
    'middle-east': ['Israel', 'UAE', 'Turkey'],
    'asia': ['Thailand', 'Japan', 'Singapore', 'Indonesia'],
    'europe': ['France', 'UK', 'Italy', 'Spain', 'Netherlands', 'Czech Republic', 'Austria'],
    'americas': ['USA'],
    'oceania': ['Australia'],
  };
  const countries = continentCountries[continentId];
  if (!countries) return [];
  const normCountries = countries.map((c) => c.toLowerCase());
  return HOTELS.filter((h) => normCountries.includes(h.country.toLowerCase()));
}

export function getHotelsByCities(cities) {
  if (!cities || cities.length === 0) return HOTELS;
  const normCities = cities.map((c) => c.trim().toLowerCase());
  return HOTELS.filter((h) => normCities.includes(h.city.toLowerCase()));
}

export function findHotel(hotelKey) {
  return HOTELS.find((h) => h.hotelKey === hotelKey) || null;
}

export function searchHotels(query) {
  if (!query) return [];
  const q = query.trim().toLowerCase();
  return HOTELS.filter(
    (h) =>
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.country.toLowerCase().includes(q)
  ).slice(0, 10);
}
