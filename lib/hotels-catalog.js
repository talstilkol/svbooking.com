// Curated hotel catalog with TripAdvisor hotel keys (format: g{locationId}-d{hotelId})
// Used with Xotelo API for provider-returned price comparison across OTAs.

import { normalizeHttpsUrl } from './utils/public-url-safety.js';

const CITY_IMAGES = {
  'Tel Aviv':    'https://images.unsplash.com/photo-1547483029-77784da27709?w=800&q=80',
  'Jerusalem':   'https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=800&q=80',
  'Phuket':      'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80',
  'Bangkok':     'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
  'Bali':        'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  'Tokyo':       'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
  'Singapore':   'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80',
  'Paris':       'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  'London':      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
  'Rome':        'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=800&q=80',
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
  // ── New cities from Wikidata expansion ──
  'Athens':       'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80',
  'Berlin':       'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',
  'Brisbane':     'https://images.unsplash.com/photo-1554939437-ecc492c67b78?w=800&q=80',
  'Budapest':     'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=800&q=80',
  'Cairo':        'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80',
  'Colombo':      'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=800&q=80',
  'Dresden':      'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=800&q=80',
  'Granada':      'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80',
  'Helsinki':     'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?w=800&q=80',
  'Jaipur':       'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
  'Jeddah':       'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=800&q=80',
  'Kuala Lumpur': 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80',
  'Lisbon':       'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80',
  'Melbourne':    'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&q=80',
  'Munich':       'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80',
  'Málaga':       'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=800&q=80',
  'Nairobi':      'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
  'New Delhi':    'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80',
  'Perth':        'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=800&q=80',
  'Porto':        'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
  'Riyadh':       'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=800&q=80',
  'Salvador':     'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80',
  'Seoul':        'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=80',
  'Toronto':      'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80',
  'Venice':       'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80',
  'Zagreb':       'https://images.unsplash.com/photo-1544084944-15269ec7b5a0?w=800&q=80',
  // ── Expansion cities ──
  'Madrid':       'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&q=80',
  'Florence':     'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=800&q=80',
  'Milan':        'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=800&q=80',
  'Dublin':       'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=800&q=80',
  'Edinburgh':    'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=800&q=80',
  'Zurich':       'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=800&q=80',
  'Copenhagen':   'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=800&q=80',
  'Stockholm':    'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800&q=80',
  'Marrakech':    'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80',
  'Cape Town':    'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',
  'Hong Kong':    'https://images.unsplash.com/photo-1536421469767-80559bb6f5e1?w=800&q=80',
  'Kyoto':        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  'San Francisco':'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80',
  'Los Angeles':  'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80',
  'Chicago':      'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80',
  'Washington DC':'https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=800&q=80',
  'Cancun':       'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&q=80',
  'Rio de Janeiro':'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
  'Buenos Aires': 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=800&q=80',
  'Doha':         'https://images.unsplash.com/photo-1549927681-0b673b8243ab?w=800&q=80',
  'Abu Dhabi':    'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800&q=80',
  'Santorini':    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
  'Nice':         'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=800&q=80',
  'Dubrovnik':    'https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&q=80',
  'Krakow':       'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80',
  'Warsaw':       'https://images.unsplash.com/photo-1607427293702-036933bbf746?w=800&q=80',
  'Osaka':        'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80',
  'Mumbai':       'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=800&q=80',
  'Seville':      'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
  'Maldives':     'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
  'Hanoi':        'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
  'Mexico City':  'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=800&q=80',
  'Muscat':       'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=800&q=80',
  'Amman':        'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80',
  // ── Phase 2 expansion cities ──
  'Boston':       'https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=800&q=80',
  'Seattle':      'https://images.unsplash.com/photo-1541188495357-ad2dc89487f4?w=800&q=80',
  'Montreal':     'https://images.unsplash.com/photo-1519178614-68673b201f36?w=800&q=80',
  'Vancouver':    'https://images.unsplash.com/photo-1609825488888-3a766db05542?w=800&q=80',
  'Lima':         'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80',
  'Bogota':       'https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80',
  'Cartagena':    'https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=800&q=80',
  'Johannesburg': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
  'Casablanca':   'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?w=800&q=80',
  'Dar es Salaam':'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
  'Zanzibar':     'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800&q=80',
  'Mauritius':    'https://images.unsplash.com/photo-1589979481223-deb893043163?w=800&q=80',
  'Shanghai':     'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80',
  'Beijing':      'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80',
  'Taipei':       'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80',
  'Ho Chi Minh City':'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
  'Chiang Mai':   'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80',
  'Lyon':         'https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=800&q=80',
  'Cannes':       'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=800&q=80',
  'Naples':       'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80',
  'Amalfi Coast': 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80',
  'Hamburg':      'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800&q=80',
  'Frankfurt':    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
  'Bruges':       'https://images.unsplash.com/photo-1559113202-c916b8e44373?w=800&q=80',
  'Brussels':     'https://images.unsplash.com/photo-1559113202-c916b8e44373?w=800&q=80',
  'Geneva':       'https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=800&q=80',
  'Tallinn':      'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',
  'Reykjavik':    'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80',
  'Oslo':         'https://images.unsplash.com/photo-1465778893808-9b3d1b443be4?w=800&q=80',
  'Cusco':        'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80',
  'Santiago':     'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80',
  'Manama':       'https://images.unsplash.com/photo-1549927681-0b673b8243ab?w=800&q=80',
  'Kuwait City':  'https://images.unsplash.com/photo-1549927681-0b673b8243ab?w=800&q=80',
  'Addis Ababa':  'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
  'Lagos':        'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
  'Accra':        'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
  'Machu Picchu': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80',
  'Udaipur':      'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
  'Goa':          'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
  'Auckland':     'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80',
  'Queenstown':   'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
  'Fiji':         'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800&q=80',
  // ── Final push cities ──
  'Scottsdale':   'https://images.unsplash.com/photo-1558645836-e44122a743ee?w=800&q=80',
  'Austin':       'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&q=80',
  'Nashville':    'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800&q=80',
  'Maui':         'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=800&q=80',
  'Honolulu':     'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=800&q=80',
  'San Diego':    'https://images.unsplash.com/photo-1538330627166-33d1908c210d?w=800&q=80',
  'Batumi':       'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80',
  'Tbilisi':      'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80',
  'Vilnius':      'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80',
  'Split':        'https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&q=80',
  'Mykonos':      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
  'Crete':        'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
  'Salzburg':     'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80',
  'Ibiza':        'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
  'Palma de Mallorca':'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
  'Tulum':        'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&q=80',
  'Medellín':     'https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&q=80',
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80';
const HOTEL_KEY_PATTERN = /^g\d+-d\d+$/;
const BLOCKED_CATALOG_TEXT_VALUES = new Set([
  'demo',
  'example',
  'fake',
  'placeholder',
  'sample',
  'test',
  'tbd',
  'unknown',
  'unverified',
]);

function img(city) { return CITY_IMAGES[city] || DEFAULT_IMAGE; }

function cleanTextValue(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  return text || null;
}

function cleanCatalogText(value) {
  const text = cleanTextValue(value);
  if (!text) return null;
  return BLOCKED_CATALOG_TEXT_VALUES.has(text.toLowerCase()) ? null : text;
}

function lookupKey(value) {
  const text = cleanTextValue(value);
  return text ? text.toLowerCase() : null;
}

function normalizeStars(value) {
  const stars = Number(value);
  return Number.isFinite(stars) && stars >= 0 && stars <= 5 ? stars : 0;
}

function normalizeLatitude(value) {
  const latitude = Number(value);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 ? latitude : null;
}

function normalizeLongitude(value) {
  const longitude = Number(value);
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? longitude : null;
}

function normalizePlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

function normalizeNullableObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : null;
}

function normalizeDiscoveredHotel(hotel) {
  if (!hotel || typeof hotel !== 'object') return null;

  const hotelKey = cleanCatalogText(hotel.hotelKey);
  if (!hotelKey || !HOTEL_KEY_PATTERN.test(hotelKey)) return null;

  const name = cleanCatalogText(hotel.name);
  const city = cleanCatalogText(hotel.city);
  const country = cleanCatalogText(hotel.country);
  if (!name || !city || !country) return null;

  return {
    hotelKey,
    name,
    city,
    country,
    stars: normalizeStars(hotel.stars),
    lat: normalizeLatitude(hotel.lat),
    lon: normalizeLongitude(hotel.lon),
    source: cleanCatalogText(hotel.source),
    sourceUrl: normalizeHttpsUrl(hotel.sourceUrl),
    externalIds: normalizePlainObject(hotel.externalIds),
    provenance: normalizeNullableObject(hotel.provenance),
  };
}

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
  { hotelKey: 'g14129528-d310308',name:'The Tokyo Station Hotel',      city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g1066456-d12211058',name:'Park Hyatt Tokyo',           city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g1066456-d320532',name: 'The Peninsula Tokyo',         city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g1066443-d302435',name: 'Imperial Hotel Tokyo',        city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },

  // ── SINGAPORE ────────────────────────────────────────────
  { hotelKey: 'g294265-d301181', name: 'Marina Bay Sands',            city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },
  { hotelKey: 'g294265-d300971', name: 'Raffles Hotel Singapore',     city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },
  { hotelKey: 'g294264-d3300141',name: 'W Singapore - Sentosa Cove',   city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },

  // ── FRANCE ───────────────────────────────────────────────
  { hotelKey: 'g187147-d188728', name: 'Le Meurice',                  city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d197539', name: 'Hotel Plaza Athenee',         city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d188630', name: 'Shangri-La Paris',            city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d264823', name: 'Hotel Costes',                city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d188729', name: 'Four Seasons Hotel George V', city: 'Paris',      country: 'France',      image: img('Paris') },

  // ── UK ───────────────────────────────────────────────────
  { hotelKey: 'g186338-d193089', name: 'The Savoy',                   city: 'London',     country: 'United Kingdom',          image: img('London') },
  { hotelKey: 'g186338-d187591', name: 'The Ritz London',             city: 'London',     country: 'United Kingdom',          image: img('London') },
  { hotelKey: 'g186338-d188616', name: "Claridge's",                  city: 'London',     country: 'United Kingdom',          image: img('London') },
  { hotelKey: 'g186338-d191299', name: 'The Dorchester',              city: 'London',     country: 'United Kingdom',          image: img('London') },
  { hotelKey: 'g186338-d188753', name: 'Rosewood London',             city: 'London',     country: 'United Kingdom',          image: img('London') },

  // ── ITALY ────────────────────────────────────────────────
  { hotelKey: 'g187791-d232380', name: 'Palazzo Manfredi',            city: 'Rome',       country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187791-d234524', name: 'Hotel de Russie',             city: 'Rome',       country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187791-d233261', name: 'Hotel Hassler Roma',          city: 'Rome',       country: 'Italy',       image: img('Rome') },

  // ── SPAIN ────────────────────────────────────────────────
  { hotelKey: 'g187497-d1465497',name: 'W Barcelona',                 city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },
  { hotelKey: 'g187497-d190616', name: 'Majestic Hotel & Spa Barcelona',city: 'Barcelona',country: 'Spain',       image: img('Barcelona') },
  { hotelKey: 'g187497-d231497', name: 'Cotton House Hotel',          city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },

  // ── NETHERLANDS ──────────────────────────────────────────
  { hotelKey: 'g188590-d189389', name: 'Sofitel Legend The Grand Amsterdam',city: 'Amsterdam',country: 'Netherlands', image: img('Amsterdam') },
  { hotelKey: 'g188590-d261895', name: 'Pulitzer Amsterdam',          city: 'Amsterdam',  country: 'Netherlands', image: img('Amsterdam') },
  { hotelKey: 'g188590-d248399', name: 'Hotel V Nesplein',            city: 'Amsterdam',  country: 'Netherlands', image: img('Amsterdam') },

  // ── CZECH REPUBLIC ───────────────────────────────────────
  { hotelKey: 'g274707-d276532', name: 'Four Seasons Prague',         city: 'Prague',     country: 'Czech Republic', image: img('Prague') },
  { hotelKey: 'g274707-d280282', name: 'Aria Hotel Prague',           city: 'Prague',     country: 'Czech Republic', image: img('Prague') },
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
  { hotelKey: 'g34438-d224877',  name: 'Mandarin Oriental Miami',     city: 'Miami',      country: 'USA',         image: img('Miami') },
  { hotelKey: 'g34438-d278074',  name: 'Four Seasons Hotel Miami',    city: 'Miami',      country: 'USA',         image: img('Miami') },
  { hotelKey: 'g45963-d1456410', name: 'Waldorf Astoria Las Vegas',   city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },
  { hotelKey: 'g45963-d1246438', name: 'ARIA Resort & Casino',        city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },

  // ── AUSTRALIA ────────────────────────────────────────────
  { hotelKey: 'g255060-d303928', name: 'Park Hyatt Sydney',           city: 'Sydney',     country: 'Australia',   image: img('Sydney') },
  { hotelKey: 'g255060-d256570', name: 'InterContinental Sydney',     city: 'Sydney',     country: 'Australia',   image: img('Sydney') },
  { hotelKey: 'g255060-d255650', name: 'Hilton Sydney',               city: 'Sydney',     country: 'Australia',   image: img('Sydney') },
  { hotelKey: 'g255068-d33251079',name: 'InterContinental Brisbane',  city: 'Brisbane',   country: 'Australia',   image: img('Brisbane') },
  { hotelKey: 'g255100-d276183', name: 'DoubleTree by Hilton Melbourne',city:'Melbourne', country: 'Australia',   image: img('Melbourne') },
  { hotelKey: 'g255103-d255646', name: 'Parmelia Hilton Perth',       city: 'Perth',      country: 'Australia',   image: img('Perth') },

  // ── AUSTRIA (expanded) ──────────────────────────────────
  { hotelKey: 'g190454-d2216081', name: 'DoubleTree by Hilton Vienna Schonbrunn', city: 'Vienna', country: 'Austria', image: img('Vienna') },
  { hotelKey: 'g190454-d228207', name: 'Hilton Vienna Park',          city: 'Vienna',     country: 'Austria',     image: img('Vienna') },
  { hotelKey: 'g190454-d227145', name: 'Hilton Vienna Plaza',         city: 'Vienna',     country: 'Austria',     image: img('Vienna') },
  { hotelKey: 'g190454-d227146', name: 'Hilton Vienna Waterfront',    city: 'Vienna',     country: 'Austria',     image: img('Vienna') },

  // ── BRAZIL ──────────────────────────────────────────────
  { hotelKey: 'g303272-d940061', name: 'Gran Hotel Stella Maris',     city: 'Salvador',   country: 'Brazil',      image: img('Salvador') },
  { hotelKey: 'g303272-d3723986', name: 'Hotel da Bahia',             city: 'Salvador',   country: 'Brazil',      image: img('Salvador') },
  { hotelKey: 'g303272-d15336700',name: 'Hotel Fasano Salvador',      city: 'Salvador',   country: 'Brazil',      image: img('Salvador') },
  { hotelKey: 'g303272-d299387', name: 'Hotel Quatro Rodas',          city: 'Salvador',   country: 'Brazil',      image: img('Salvador') },
  { hotelKey: 'g303272-d300919', name: 'Novotel Salvador Rio Vermelho',city:'Salvador',   country: 'Brazil',      image: img('Salvador') },

  // ── CANADA ──────────────────────────────────────────────
  { hotelKey: 'g155019-d6678171', name: 'Delta Toronto Hotel',        city: 'Toronto',    country: 'Canada',      image: img('Toronto') },

  // ── CROATIA ─────────────────────────────────────────────
  { hotelKey: 'g294454-d15120354',name: 'Canopy by Hilton Zagreb',    city: 'Zagreb',     country: 'Croatia',     image: img('Zagreb') },

  // ── EGYPT ───────────────────────────────────────────────
  { hotelKey: 'g294201-d299719', name: 'Cairo Marriott Hotel',        city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d13327782',name: 'Cleopatra Hotel Cairo',      city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d302720', name: 'Conrad Cairo',                city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d580690', name: 'Fairmont Nile City Cairo',    city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d308077', name: 'Four Seasons Cairo Nile Plaza',city:'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d1597516', name: 'Kempinski Nile Hotel Cairo', city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d21223645',name: 'Madina Hostel',              city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d304481', name: 'Sofitel Cairo El Gezirah',    city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d12527818',name: 'St. Regis Cairo',            city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },
  { hotelKey: 'g294201-d460113', name: 'Victoria Cairo Hotel',        city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },

  // ── FINLAND ─────────────────────────────────────────────
  { hotelKey: 'g189934-d228677', name: 'Hilton Helsinki Kalastajatorppa',city:'Helsinki', country: 'Finland',     image: img('Helsinki') },
  { hotelKey: 'g189934-d26687987',name: 'Waldorf Astoria Helsinki',   city: 'Helsinki',   country: 'Finland',     image: img('Helsinki') },

  // ── GERMANY ─────────────────────────────────────────────
  { hotelKey: 'g187323-d12239014',name: 'Hampton by Hilton Berlin Alexanderplatz',city:'Berlin',country:'Germany',image: img('Berlin') },
  { hotelKey: 'g187323-d1858856', name: 'Hampton by Hilton Berlin City West',city:'Berlin',country:'Germany',     image: img('Berlin') },
  { hotelKey: 'g187323-d191438', name: 'Hilton Berlin',               city: 'Berlin',     country: 'Germany',     image: img('Berlin') },
  { hotelKey: 'g187323-d2481544', name: 'Waldorf Astoria Berlin',     city: 'Berlin',     country: 'Germany',     image: img('Berlin') },
  { hotelKey: 'g187399-d199740', name: 'Hilton Dresden',              city: 'Dresden',    country: 'Germany',     image: img('Dresden') },
  { hotelKey: 'g187309-d1879138', name: 'Adagio Muenchen City',       city: 'Munich',     country: 'Germany',     image: img('Munich') },
  { hotelKey: 'g187309-d23891304',name: 'Hampton by Hilton Munich North',city:'Munich',   country: 'Germany',     image: img('Munich') },
  { hotelKey: 'g187309-d14149849',name: 'Hampton by Hilton Munich West',city:'Munich',    country: 'Germany',     image: img('Munich') },
  { hotelKey: 'g187309-d14102023',name: 'Hilton Garden Inn Munich',    city: 'Munich',    country: 'Germany',     image: img('Munich') },

  // ── GREECE ──────────────────────────────────────────────
  { hotelKey: 'g189400-d28030390',name: 'Anise Aluma Athens',         city: 'Athens',     country: 'Greece',      image: img('Athens') },
  { hotelKey: 'g189400-d34175623',name: 'Conrad Athens The Ilisian',  city: 'Athens',     country: 'Greece',      image: img('Athens') },

  // ── HUNGARY ─────────────────────────────────────────────
  { hotelKey: 'g274887-d25631806',name: 'Hampton by Hilton Budapest', city: 'Budapest',   country: 'Hungary',     image: img('Budapest') },

  // ── INDIA ───────────────────────────────────────────────
  { hotelKey: 'g304555-d6540893', name: 'Hilton Jaipur',              city: 'Jaipur',     country: 'India',       image: img('Jaipur') },
  { hotelKey: 'g304551-d2463248', name: 'DoubleTree by Hilton New Delhi',city:'New Delhi', country: 'India',      image: img('New Delhi') },
  { hotelKey: 'g304551-d1546198', name: 'Hilton Garden Inn New Delhi',city: 'New Delhi',  country: 'India',       image: img('New Delhi') },

  // ── ITALY (expanded) ───────────────────────────────────
  { hotelKey: 'g187791-d203094', name: 'Hilton Garden Inn Rome Colosseum',city:'Rome',    country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187791-d190138', name: 'Rome Cavalieri Waldorf Astoria',city: 'Rome',     country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187870-d32976113',name: 'Hampton by Hilton Venice',   city: 'Venice',     country: 'Italy',       image: img('Venice') },

  // ── KENYA ───────────────────────────────────────────────
  { hotelKey: 'g294207-d13996430',name: 'Trademark Hotel Nairobi',    city: 'Nairobi',    country: 'Kenya',       image: img('Nairobi') },
  { hotelKey: 'g294207-d1158294', name: 'Tribe Hotel Nairobi',        city: 'Nairobi',    country: 'Kenya',       image: img('Nairobi') },

  // ── MALAYSIA ────────────────────────────────────────────
  { hotelKey: 'g298570-d1759018', name: 'DoubleTree by Hilton Kuala Lumpur',city:'Kuala Lumpur',country:'Malaysia',image: img('Kuala Lumpur') },
  { hotelKey: 'g298570-d12616250',name: 'Hilton Garden Inn KL North', city: 'Kuala Lumpur',country: 'Malaysia',   image: img('Kuala Lumpur') },
  { hotelKey: 'g298570-d14938612',name: 'Hilton Garden Inn KL South', city: 'Kuala Lumpur',country: 'Malaysia',   image: img('Kuala Lumpur') },
  { hotelKey: 'g298570-d555433',  name: 'Hilton Kuala Lumpur',        city: 'Kuala Lumpur',country: 'Malaysia',   image: img('Kuala Lumpur') },

  // ── PORTUGAL ────────────────────────────────────────────
  { hotelKey: 'g189158-d674862', name: 'DoubleTree by Hilton Lisbon', city: 'Lisbon',     country: 'Portugal',    image: img('Lisbon') },
  { hotelKey: 'g189158-d227433', name: 'Ramada by Wyndham Lisbon',    city: 'Lisbon',     country: 'Portugal',    image: img('Lisbon') },
  { hotelKey: 'g189180-d25401610',name: 'Arts Hotel Porto',           city: 'Porto',      country: 'Portugal',    image: img('Porto') },

  // ── SAUDI ARABIA ────────────────────────────────────────
  { hotelKey: 'g295419-d13613394',name: 'The Hotel Galleria Jeddah',  city: 'Jeddah',     country: 'Saudi Arabia', image: img('Jeddah') },
  { hotelKey: 'g293995-d7178459', name: 'DoubleTree by Hilton Riyadh',city: 'Riyadh',     country: 'Saudi Arabia', image: img('Riyadh') },

  // ── SOUTH KOREA ─────────────────────────────────────────
  { hotelKey: 'g294197-d3477158', name: 'Conrad Seoul',               city: 'Seoul',      country: 'South Korea', image: img('Seoul') },
  { hotelKey: 'g294197-d9764280', name: 'Handpicked Hotel Seoul',     city: 'Seoul',      country: 'South Korea', image: img('Seoul') },

  // ── SPAIN (expanded) ───────────────────────────────────
  { hotelKey: 'g187441-d1025279', name: 'Senator Granada Spa Hotel',  city: 'Granada',    country: 'Spain',       image: img('Granada') },
  { hotelKey: 'g187438-d28897091',name: 'Hampton by Hilton Málaga',   city: 'Málaga',     country: 'Spain',       image: img('Málaga') },

  // ── SRI LANKA ───────────────────────────────────────────
  { hotelKey: 'g293962-d300682', name: 'Hilton Colombo Residences',   city: 'Colombo',    country: 'Sri Lanka',   image: img('Colombo') },

  // ── UNITED KINGDOM (expanded) ──────────────────────────
  { hotelKey: 'g186338-d199848', name: '100 Queen\'s Gate Hotel London',city:'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d195216', name: 'DoubleTree by Hilton London Hyde Park',city:'London',country:'United Kingdom',image: img('London') },
  { hotelKey: 'g186338-d195204', name: 'DoubleTree by Hilton London Victoria',city:'London',country:'United Kingdom',image: img('London') },
  { hotelKey: 'g186338-d193102', name: 'DoubleTree by Hilton London West End',city:'London',country:'United Kingdom',image: img('London') },
  { hotelKey: 'g186338-d289306', name: 'DoubleTree by Hilton London ExCel',city:'London',  country:'United Kingdom',image: img('London') },
  { hotelKey: 'g186338-d195184', name: 'Hilton London Hyde Park',     city: 'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d195185', name: 'Hilton London Kensington',    city: 'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d23906171',name: 'Lost Property St Paul\'s London',city:'London',   country:'United Kingdom',image: img('London') },
  { hotelKey: 'g186338-d209237', name: 'The Trafalgar St. James London',city:'London',     country:'United Kingdom',image: img('London') },

  // ═══════════════════════════════════════════════════════════════
  // CATALOG EXPANSION — May 2026
  // ═══════════════════════════════════════════════════════════════

  // ── SPAIN (expanded) ──────────────────────────────────────
  { hotelKey: 'g187514-d233700', name: 'Hotel Ritz Madrid',              city: 'Madrid',     country: 'Spain',       image: img('Madrid') },
  { hotelKey: 'g187514-d232083', name: 'Hotel Villa Magna',              city: 'Madrid',     country: 'Spain',       image: img('Madrid') },
  { hotelKey: 'g187514-d237025', name: 'Only YOU Boutique Hotel Madrid', city: 'Madrid',     country: 'Spain',       image: img('Madrid') },
  { hotelKey: 'g187514-d206543', name: 'NH Collection Madrid Eurobuilding',city:'Madrid',    country: 'Spain',       image: img('Madrid') },
  { hotelKey: 'g187514-d233939', name: 'Westin Palace Madrid',           city: 'Madrid',     country: 'Spain',       image: img('Madrid') },
  { hotelKey: 'g187443-d230098', name: 'Hotel Alfonso XIII Seville',     city: 'Seville',    country: 'Spain',       image: img('Seville') },
  { hotelKey: 'g187443-d233147', name: 'Hotel Mercer Sevilla',           city: 'Seville',    country: 'Spain',       image: img('Seville') },
  { hotelKey: 'g187443-d237710', name: 'EME Catedral Hotel Seville',     city: 'Seville',    country: 'Spain',       image: img('Seville') },

  // ── ITALY (expansion) ─────────────────────────────────────
  { hotelKey: 'g187895-d195685', name: 'Hotel Savoy Florence',           city: 'Florence',   country: 'Italy',       image: img('Florence') },
  { hotelKey: 'g187895-d195048', name: 'Four Seasons Hotel Firenze',     city: 'Florence',   country: 'Italy',       image: img('Florence') },
  { hotelKey: 'g187895-d195780', name: 'Portrait Firenze',               city: 'Florence',   country: 'Italy',       image: img('Florence') },
  { hotelKey: 'g187895-d209547', name: 'Hotel Lungarno Florence',        city: 'Florence',   country: 'Italy',       image: img('Florence') },
  { hotelKey: 'g187849-d230161', name: 'Park Hyatt Milan',               city: 'Milan',      country: 'Italy',       image: img('Milan') },
  { hotelKey: 'g187849-d233440', name: 'Armani Hotel Milano',            city: 'Milan',      country: 'Italy',       image: img('Milan') },
  { hotelKey: 'g187849-d205485', name: 'Bulgari Hotel Milan',            city: 'Milan',      country: 'Italy',       image: img('Milan') },
  { hotelKey: 'g187849-d230164', name: 'Mandarin Oriental Milan',        city: 'Milan',      country: 'Italy',       image: img('Milan') },

  // ── IRELAND ────────────────────────────────────────────────
  { hotelKey: 'g186605-d189027', name: 'The Merrion Dublin',             city: 'Dublin',     country: 'Ireland',     image: img('Dublin') },
  { hotelKey: 'g186605-d190079', name: 'The Shelbourne Dublin',          city: 'Dublin',     country: 'Ireland',     image: img('Dublin') },
  { hotelKey: 'g186605-d188076', name: 'The Westbury Dublin',            city: 'Dublin',     country: 'Ireland',     image: img('Dublin') },
  { hotelKey: 'g186605-d189105', name: 'The Marker Hotel Dublin',        city: 'Dublin',     country: 'Ireland',     image: img('Dublin') },

  // ── UK (Edinburgh) ─────────────────────────────────────────
  { hotelKey: 'g186525-d192131', name: 'The Balmoral Edinburgh',         city: 'Edinburgh',  country: 'United Kingdom', image: img('Edinburgh') },
  { hotelKey: 'g186525-d191632', name: 'The Scotsman Hotel Edinburgh',   city: 'Edinburgh',  country: 'United Kingdom', image: img('Edinburgh') },
  { hotelKey: 'g186525-d193506', name: 'Waldorf Astoria Edinburgh',      city: 'Edinburgh',  country: 'United Kingdom', image: img('Edinburgh') },

  // ── SWITZERLAND ────────────────────────────────────────────
  { hotelKey: 'g188113-d197451', name: 'Baur au Lac Zurich',             city: 'Zurich',     country: 'Switzerland', image: img('Zurich') },
  { hotelKey: 'g188113-d197405', name: 'The Dolder Grand Zurich',        city: 'Zurich',     country: 'Switzerland', image: img('Zurich') },
  { hotelKey: 'g188113-d197421', name: 'Park Hyatt Zurich',              city: 'Zurich',     country: 'Switzerland', image: img('Zurich') },

  // ── DENMARK ────────────────────────────────────────────────
  { hotelKey: 'g189541-d228285', name: 'Hotel d\'Angleterre Copenhagen', city: 'Copenhagen', country: 'Denmark',     image: img('Copenhagen') },
  { hotelKey: 'g189541-d230625', name: 'Nimb Hotel Copenhagen',          city: 'Copenhagen', country: 'Denmark',     image: img('Copenhagen') },
  { hotelKey: 'g189541-d234561', name: 'Radisson Collection Copenhagen', city: 'Copenhagen', country: 'Denmark',     image: img('Copenhagen') },

  // ── SWEDEN ─────────────────────────────────────────────────
  { hotelKey: 'g189852-d199820', name: 'Grand Hotel Stockholm',          city: 'Stockholm',  country: 'Sweden',      image: img('Stockholm') },
  { hotelKey: 'g189852-d207437', name: 'Bank Hotel Stockholm',           city: 'Stockholm',  country: 'Sweden',      image: img('Stockholm') },
  { hotelKey: 'g189852-d226398', name: 'At Six Stockholm',               city: 'Stockholm',  country: 'Sweden',      image: img('Stockholm') },

  // ── MOROCCO ────────────────────────────────────────────────
  { hotelKey: 'g293734-d307075', name: 'La Mamounia Marrakech',          city: 'Marrakech',  country: 'Morocco',     image: img('Marrakech') },
  { hotelKey: 'g293734-d304014', name: 'Royal Mansour Marrakech',        city: 'Marrakech',  country: 'Morocco',     image: img('Marrakech') },
  { hotelKey: 'g293734-d300118', name: 'Four Seasons Marrakech',         city: 'Marrakech',  country: 'Morocco',     image: img('Marrakech') },
  { hotelKey: 'g293734-d627474', name: 'Riad Kniza Marrakech',           city: 'Marrakech',  country: 'Morocco',     image: img('Marrakech') },

  // ── SOUTH AFRICA ───────────────────────────────────────────
  { hotelKey: 'g312659-d1546451', name: 'Taj Cape Town',                 city: 'Cape Town',  country: 'South Africa', image: img('Cape Town') },
  { hotelKey: 'g1722390-d304741', name: 'Belmond Mount Nelson Cape Town',city: 'Cape Town',  country: 'South Africa', image: img('Cape Town') },
  { hotelKey: 'g1722390-d479218', name: 'The Silo Hotel Cape Town',      city: 'Cape Town',  country: 'South Africa', image: img('Cape Town') },

  // ── HONG KONG ──────────────────────────────────────────────
  { hotelKey: 'g294217-d302318', name: 'The Peninsula Hong Kong',        city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
  { hotelKey: 'g294217-d16913872',name:'The St. Regis Hong Kong',        city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
  { hotelKey: 'g294217-d306566', name: 'Four Seasons Hotel Hong Kong',   city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
  { hotelKey: 'g294217-d300698', name: 'The Ritz-Carlton Hong Kong',     city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
  { hotelKey: 'g294217-d300144', name: 'InterContinental Hong Kong',     city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },

  // ── JAPAN (Kyoto + Osaka) ──────────────────────────────────
  { hotelKey: 'g298564-d586835', name: 'The Ritz-Carlton Kyoto',         city: 'Kyoto',      country: 'Japan',       image: img('Kyoto') },
  { hotelKey: 'g298564-d302291', name: 'Four Seasons Kyoto',             city: 'Kyoto',      country: 'Japan',       image: img('Kyoto') },
  { hotelKey: 'g298564-d300555', name: 'Park Hyatt Kyoto',               city: 'Kyoto',      country: 'Japan',       image: img('Kyoto') },
  { hotelKey: 'g298566-d307371', name: 'The Ritz-Carlton Osaka',         city: 'Osaka',      country: 'Japan',       image: img('Osaka') },
  { hotelKey: 'g298566-d301178', name: 'InterContinental Osaka',         city: 'Osaka',      country: 'Japan',       image: img('Osaka') },
  { hotelKey: 'g298566-d308792', name: 'W Osaka',                        city: 'Osaka',      country: 'Japan',       image: img('Osaka') },

  // ── USA (expansion) ────────────────────────────────────────
  { hotelKey: 'g60713-d77769',   name: 'Fairmont San Francisco',         city: 'San Francisco',country:'USA',        image: img('San Francisco') },
  { hotelKey: 'g60713-d80727',   name: 'The Ritz-Carlton San Francisco', city: 'San Francisco',country:'USA',        image: img('San Francisco') },
  { hotelKey: 'g60713-d77773',   name: 'Palace Hotel San Francisco',     city: 'San Francisco',country:'USA',        image: img('San Francisco') },
  { hotelKey: 'g60713-d81400',   name: 'Four Seasons San Francisco',     city: 'San Francisco',country:'USA',        image: img('San Francisco') },
  { hotelKey: 'g32655-d80355',   name: 'The Beverly Hills Hotel',        city: 'Los Angeles',country: 'USA',         image: img('Los Angeles') },
  { hotelKey: 'g32655-d250113',  name: 'Hotel Bel-Air',                  city: 'Los Angeles',country: 'USA',         image: img('Los Angeles') },
  { hotelKey: 'g32655-d80356',   name: 'Chateau Marmont',                city: 'Los Angeles',country: 'USA',         image: img('Los Angeles') },
  { hotelKey: 'g32655-d263785',  name: 'The Peninsula Beverly Hills',    city: 'Los Angeles',country: 'USA',         image: img('Los Angeles') },
  { hotelKey: 'g35805-d84676',   name: 'The Peninsula Chicago',          city: 'Chicago',    country: 'USA',         image: img('Chicago') },
  { hotelKey: 'g35805-d84186',   name: 'Four Seasons Hotel Chicago',     city: 'Chicago',    country: 'USA',         image: img('Chicago') },
  { hotelKey: 'g35805-d4726429', name: 'The Langham Chicago',            city: 'Chicago',    country: 'USA',         image: img('Chicago') },
  { hotelKey: 'g28970-d84123',   name: 'The Watergate Hotel',            city: 'Washington DC',country:'USA',        image: img('Washington DC') },
  { hotelKey: 'g28970-d82470',   name: 'Four Seasons Washington DC',     city: 'Washington DC',country:'USA',        image: img('Washington DC') },
  { hotelKey: 'g28970-d82477',   name: 'The Hay-Adams',                  city: 'Washington DC',country:'USA',        image: img('Washington DC') },

  // ── MEXICO ─────────────────────────────────────────────────
  { hotelKey: 'g150807-d152585', name: 'The Ritz-Carlton Cancun',        city: 'Cancun',     country: 'Mexico',      image: img('Cancun') },
  { hotelKey: 'g150807-d153210', name: 'JW Marriott Cancun Resort',      city: 'Cancun',     country: 'Mexico',      image: img('Cancun') },
  { hotelKey: 'g150807-d152591', name: 'Hyatt Zilara Cancun',            city: 'Cancun',     country: 'Mexico',      image: img('Cancun') },
  { hotelKey: 'g150800-d155389', name: 'Four Seasons Mexico City',       city: 'Mexico City',country: 'Mexico',      image: img('Mexico City') },
  { hotelKey: 'g150800-d155501', name: 'St. Regis Mexico City',          city: 'Mexico City',country: 'Mexico',      image: img('Mexico City') },
  { hotelKey: 'g150800-d155366', name: 'Hotel Geneve Ciudad de Mexico',  city: 'Mexico City',country: 'Mexico',      image: img('Mexico City') },

  // ── BRAZIL (expansion) ─────────────────────────────────────
  { hotelKey: 'g303506-d309221', name: 'Belmond Copacabana Palace',      city: 'Rio de Janeiro',country:'Brazil',    image: img('Rio de Janeiro') },
  { hotelKey: 'g303506-d300395', name: 'Fasano Rio de Janeiro',          city: 'Rio de Janeiro',country:'Brazil',    image: img('Rio de Janeiro') },
  { hotelKey: 'g303506-d305020', name: 'Hotel Emiliano Rio',             city: 'Rio de Janeiro',country:'Brazil',    image: img('Rio de Janeiro') },

  // ── ARGENTINA ──────────────────────────────────────────────
  { hotelKey: 'g312741-d317217', name: 'Alvear Palace Hotel',            city: 'Buenos Aires',country:'Argentina',   image: img('Buenos Aires') },
  { hotelKey: 'g312741-d580604', name: 'Four Seasons Buenos Aires',      city: 'Buenos Aires',country:'Argentina',   image: img('Buenos Aires') },
  { hotelKey: 'g312741-d309283', name: 'Park Hyatt Buenos Aires',        city: 'Buenos Aires',country:'Argentina',   image: img('Buenos Aires') },

  // ── UAE (Abu Dhabi) ────────────────────────────────────────
  { hotelKey: 'g294013-d306129', name: 'Emirates Palace Abu Dhabi',      city: 'Abu Dhabi',  country: 'UAE',         image: img('Abu Dhabi') },
  { hotelKey: 'g294013-d1628412',name: 'The Ritz-Carlton Abu Dhabi',     city: 'Abu Dhabi',  country: 'UAE',         image: img('Abu Dhabi') },
  { hotelKey: 'g294013-d302096', name: 'Shangri-La Abu Dhabi',           city: 'Abu Dhabi',  country: 'UAE',         image: img('Abu Dhabi') },
  { hotelKey: 'g294013-d6400974',name: 'St. Regis Saadiyat Island',      city: 'Abu Dhabi',  country: 'UAE',         image: img('Abu Dhabi') },

  // ── QATAR ──────────────────────────────────────────────────
  { hotelKey: 'g294009-d302111', name: 'W Doha Hotel & Residences',      city: 'Doha',       country: 'Qatar',       image: img('Doha') },
  { hotelKey: 'g294009-d592987', name: 'Banana Island Resort Doha',      city: 'Doha',       country: 'Qatar',       image: img('Doha') },
  { hotelKey: 'g294009-d574723', name: 'The St. Regis Doha',             city: 'Doha',       country: 'Qatar',       image: img('Doha') },

  // ── GREECE (Santorini) ─────────────────────────────────────
  { hotelKey: 'g189433-d663377', name: 'Grace Hotel Santorini',          city: 'Santorini',  country: 'Greece',      image: img('Santorini') },
  { hotelKey: 'g189433-d479513', name: 'Canaves Oia Santorini',          city: 'Santorini',  country: 'Greece',      image: img('Santorini') },
  { hotelKey: 'g189433-d1063838',name: 'Andronis Luxury Suites',         city: 'Santorini',  country: 'Greece',      image: img('Santorini') },

  // ── FRANCE (Nice) ──────────────────────────────────────────
  { hotelKey: 'g187234-d190662', name: 'Hotel Negresco Nice',            city: 'Nice',       country: 'France',      image: img('Nice') },
  { hotelKey: 'g187234-d194155', name: 'Hyatt Regency Nice',             city: 'Nice',       country: 'France',      image: img('Nice') },
  { hotelKey: 'g187234-d199076', name: 'Hotel La Perouse Nice',          city: 'Nice',       country: 'France',      image: img('Nice') },

  // ── CROATIA (Dubrovnik) ────────────────────────────────────
  { hotelKey: 'g295371-d580085', name: 'Hotel Excelsior Dubrovnik',      city: 'Dubrovnik',  country: 'Croatia',     image: img('Dubrovnik') },
  { hotelKey: 'g295371-d513543', name: 'Villa Dubrovnik',                city: 'Dubrovnik',  country: 'Croatia',     image: img('Dubrovnik') },
  { hotelKey: 'g295371-d301879', name: 'Rixos Premium Dubrovnik',        city: 'Dubrovnik',  country: 'Croatia',     image: img('Dubrovnik') },

  // ── POLAND ─────────────────────────────────────────────────
  { hotelKey: 'g274772-d277553', name: 'Hotel Stary Krakow',             city: 'Krakow',     country: 'Poland',      image: img('Krakow') },
  { hotelKey: 'g274772-d280429', name: 'Sheraton Grand Krakow',          city: 'Krakow',     country: 'Poland',      image: img('Krakow') },
  { hotelKey: 'g274772-d282310', name: 'Hotel Copernicus Krakow',        city: 'Krakow',     country: 'Poland',      image: img('Krakow') },
  { hotelKey: 'g274856-d280310', name: 'Hotel Bristol Warsaw',           city: 'Warsaw',     country: 'Poland',      image: img('Warsaw') },
  { hotelKey: 'g274856-d283174', name: 'InterContinental Warsaw',        city: 'Warsaw',     country: 'Poland',      image: img('Warsaw') },
  { hotelKey: 'g274856-d279953', name: 'Raffles Europejski Warsaw',      city: 'Warsaw',     country: 'Poland',      image: img('Warsaw') },

  // ── INDIA (Mumbai) ─────────────────────────────────────────
  { hotelKey: 'g304554-d306207', name: 'The Taj Mahal Palace Mumbai',    city: 'Mumbai',     country: 'India',       image: img('Mumbai') },
  { hotelKey: 'g304554-d306208', name: 'The Oberoi Mumbai',              city: 'Mumbai',     country: 'India',       image: img('Mumbai') },
  { hotelKey: 'g304554-d307854', name: 'Four Seasons Hotel Mumbai',      city: 'Mumbai',     country: 'India',       image: img('Mumbai') },
  { hotelKey: 'g304554-d1631282',name: 'St. Regis Mumbai',               city: 'Mumbai',     country: 'India',       image: img('Mumbai') },

  // ── MALDIVES ───────────────────────────────────────────────
  { hotelKey: 'g293953-d307972', name: 'Soneva Fushi Maldives',          city: 'Maldives',   country: 'Maldives',    image: img('Maldives') },
  { hotelKey: 'g293953-d503233', name: 'COMO Cocoa Island',              city: 'Maldives',   country: 'Maldives',    image: img('Maldives') },
  { hotelKey: 'g293953-d455715', name: 'Anantara Kihavah Maldives',      city: 'Maldives',   country: 'Maldives',    image: img('Maldives') },
  { hotelKey: 'g293953-d623555', name: 'One&Only Reethi Rah',            city: 'Maldives',   country: 'Maldives',    image: img('Maldives') },

  // ── VIETNAM ────────────────────────────────────────────────
  { hotelKey: 'g293924-d309135', name: 'Sofitel Legend Metropole Hanoi',  city: 'Hanoi',      country: 'Vietnam',     image: img('Hanoi') },
  { hotelKey: 'g293924-d468498', name: 'InterContinental Hanoi Westlake',city: 'Hanoi',      country: 'Vietnam',     image: img('Hanoi') },
  { hotelKey: 'g293924-d301936', name: 'JW Marriott Hotel Hanoi',        city: 'Hanoi',      country: 'Vietnam',     image: img('Hanoi') },

  // ── JORDAN ─────────────────────────────────────────────────
  { hotelKey: 'g293986-d300117', name: 'Four Seasons Amman',             city: 'Amman',      country: 'Jordan',      image: img('Amman') },
  { hotelKey: 'g293986-d299694', name: 'The St. Regis Amman',            city: 'Amman',      country: 'Jordan',      image: img('Amman') },
  { hotelKey: 'g293986-d302413', name: 'W Amman',                        city: 'Amman',      country: 'Jordan',      image: img('Amman') },

  // ── OMAN ───────────────────────────────────────────────────
  { hotelKey: 'g298084-d300254', name: 'Al Bustan Palace Muscat',        city: 'Muscat',     country: 'Oman',        image: img('Muscat') },
  { hotelKey: 'g298084-d300633', name: 'Shangri-La Barr Al Jissah Muscat',city:'Muscat',     country: 'Oman',        image: img('Muscat') },
  { hotelKey: 'g298084-d580667', name: 'W Muscat',                       city: 'Muscat',     country: 'Oman',        image: img('Muscat') },

  // ── HUNGARY (expanded) ─────────────────────────────────────
  { hotelKey: 'g274887-d277851', name: 'Four Seasons Gresham Palace Budapest',city:'Budapest',country:'Hungary',     image: img('Budapest') },
  { hotelKey: 'g274887-d277484', name: 'Aria Hotel Budapest',            city: 'Budapest',   country: 'Hungary',     image: img('Budapest') },
  { hotelKey: 'g274887-d278042', name: 'Corinthia Budapest',             city: 'Budapest',   country: 'Hungary',     image: img('Budapest') },

  // ── PORTUGAL (expanded) ────────────────────────────────────
  { hotelKey: 'g189158-d231519', name: 'Four Seasons Ritz Lisbon',       city: 'Lisbon',     country: 'Portugal',    image: img('Lisbon') },
  { hotelKey: 'g189158-d236131', name: 'Bairro Alto Hotel Lisbon',       city: 'Lisbon',     country: 'Portugal',    image: img('Lisbon') },
  { hotelKey: 'g189180-d12530981',name:'Torel Avantgarde',               city: 'Porto',      country: 'Portugal',    image: img('Porto') },
  { hotelKey: 'g189180-d15187226',name:'The One Monumental Palace',      city: 'Porto',      country: 'Portugal',    image: img('Porto') },

  // ── SOUTH KOREA (expanded) ─────────────────────────────────
  { hotelKey: 'g294197-d302049', name: 'Four Seasons Seoul',             city: 'Seoul',      country: 'South Korea', image: img('Seoul') },
  { hotelKey: 'g294197-d12310284',name:'SIGNIEL Seoul',                  city: 'Seoul',      country: 'South Korea', image: img('Seoul') },

  // ── CANADA (expanded) ──────────────────────────────────────
  { hotelKey: 'g155019-d155591', name: 'Fairmont Royal York Toronto',    city: 'Toronto',    country: 'Canada',      image: img('Toronto') },
  { hotelKey: 'g155019-d182584', name: 'The Ritz-Carlton Toronto',       city: 'Toronto',    country: 'Canada',      image: img('Toronto') },
  { hotelKey: 'g155019-d183076', name: 'Park Hyatt Toronto',             city: 'Toronto',    country: 'Canada',      image: img('Toronto') },

  // ── AUSTRALIA (expanded) ───────────────────────────────────
  { hotelKey: 'g255100-d277753', name: 'Crown Towers Melbourne',         city: 'Melbourne',  country: 'Australia',   image: img('Melbourne') },
  { hotelKey: 'g255100-d257281', name: 'The Langham Melbourne',          city: 'Melbourne',  country: 'Australia',   image: img('Melbourne') },
  { hotelKey: 'g255100-d256362', name: 'Park Hyatt Melbourne',           city: 'Melbourne',  country: 'Australia',   image: img('Melbourne') },

  // ── FINLAND (expanded) ─────────────────────────────────────
  { hotelKey: 'g189934-d228668', name: 'Hotel Haven Helsinki',           city: 'Helsinki',   country: 'Finland',     image: img('Helsinki') },

  // ── KENYA (expanded) ───────────────────────────────────────
  { hotelKey: 'g294207-d303942', name: 'Fairmont The Norfolk Nairobi',   city: 'Nairobi',    country: 'Kenya',       image: img('Nairobi') },
  { hotelKey: 'g294207-d301925', name: 'Sarova Stanley Hotel Nairobi',   city: 'Nairobi',    country: 'Kenya',       image: img('Nairobi') },

  // ── SRI LANKA (expanded) ───────────────────────────────────
  { hotelKey: 'g293962-d1024416', name: 'Shangri-La Hotel Colombo',      city: 'Colombo',    country: 'Sri Lanka',   image: img('Colombo') },
  { hotelKey: 'g293962-d1530770', name: 'The Kingsbury Colombo',         city: 'Colombo',    country: 'Sri Lanka',   image: img('Colombo') },

  // ── MEXICO (expansion) ─────────────────────────────────────
  { hotelKey: 'g150800-d155400', name: 'W Mexico City',                  city: 'Mexico City',country: 'Mexico',      image: img('Mexico City') },

  // ═══════════════════════════════════════════════════════════
  // CATALOG EXPANSION — Phase 2, May 2026
  // Target: 500+ hotels, 100+ cities, 50+ countries
  // ═══════════════════════════════════════════════════════════

  // ── LONDON (deep) ──────────────────────────────────────────
  { hotelKey: 'g186338-d189570', name: 'The Lanesborough',               city: 'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d192058', name: 'Brown\'s Hotel',                 city: 'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d189288', name: 'The Connaught',                  city: 'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d193038', name: 'The Berkeley',                   city: 'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d187698', name: 'Shangri-La The Shard London',    city: 'London',     country: 'United Kingdom', image: img('London') },
  { hotelKey: 'g186338-d278542', name: 'Corinthia London',               city: 'London',     country: 'United Kingdom', image: img('London') },

  // ── PARIS (deep) ───────────────────────────────────────────
  { hotelKey: 'g187147-d228730', name: 'Le Bristol Paris',               city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d188732', name: 'Hôtel Plaza Athénée',            city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d233640', name: 'Four Seasons George V Paris',    city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d197232', name: 'Hôtel de Crillon',               city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d233593', name: 'Hotel Bel Ami',                  city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d260994', name: 'Mandarin Oriental Paris',        city: 'Paris',      country: 'France',      image: img('Paris') },
  { hotelKey: 'g187147-d230048', name: 'The Peninsula Paris',            city: 'Paris',      country: 'France',      image: img('Paris') },

  // ── NEW YORK (deep) ────────────────────────────────────────
  { hotelKey: 'g60763-d93589',   name: 'The Plaza Hotel',                city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d99354',   name: 'The St. Regis New York',         city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d93437',   name: 'Mandarin Oriental New York',     city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d93339',   name: 'The Peninsula New York',         city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d113317',  name: 'Park Hyatt New York',            city: 'New York',   country: 'USA',         image: img('New York') },
  { hotelKey: 'g60763-d1783858', name: 'Aman New York',                  city: 'New York',   country: 'USA',         image: img('New York') },

  // ── TOKYO (deep) ───────────────────────────────────────────
  { hotelKey: 'g298184-d301854', name: 'Aman Tokyo',                     city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g298184-d571682', name: 'The Prince Gallery Tokyo',       city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g298184-d302152', name: 'Mandarin Oriental Tokyo',        city: 'Tokyo',      country: 'Japan',       image: img('Tokyo') },
  { hotelKey: 'g298184-d1659600',name: 'Four Seasons Hotel Tokyo Otemachi',city: 'Tokyo',    country: 'Japan',       image: img('Tokyo') },

  // ── DUBAI (deep) ───────────────────────────────────────────
  { hotelKey: 'g295424-d302139', name: 'One&Only The Palm Dubai',        city: 'Dubai',      country: 'UAE',         image: img('Dubai') },
  { hotelKey: 'g295424-d306120', name: 'Jumeirah Al Naseem',             city: 'Dubai',      country: 'UAE',         image: img('Dubai') },
  { hotelKey: 'g295424-d306076', name: 'Jumeirah Beach Hotel',           city: 'Dubai',      country: 'UAE',         image: img('Dubai') },
  { hotelKey: 'g295424-d579513', name: 'Four Seasons Resort Dubai',      city: 'Dubai',      country: 'UAE',         image: img('Dubai') },
  { hotelKey: 'g295424-d10316298',name: 'Caesars Palace Dubai',          city: 'Dubai',      country: 'UAE',         image: img('Dubai') },

  // ── BANGKOK (deep) ─────────────────────────────────────────
  { hotelKey: 'g293917-d308955', name: 'Banyan Tree Bangkok',            city: 'Bangkok',    country: 'Thailand',    image: img('Bangkok') },
  { hotelKey: 'g293917-d302175', name: 'Shangri-La Bangkok',             city: 'Bangkok',    country: 'Thailand',    image: img('Bangkok') },
  { hotelKey: 'g293917-d305157', name: 'Anantara Siam Bangkok',          city: 'Bangkok',    country: 'Thailand',    image: img('Bangkok') },

  // ── SINGAPORE (deep) ──────────────────────────────────────
  { hotelKey: 'g294265-d307079', name: 'The Fullerton Hotel Singapore',  city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },
  { hotelKey: 'g294265-d300141', name: 'The Ritz-Carlton Millenia',      city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },
  { hotelKey: 'g294265-d301930', name: 'Capella Singapore',              city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },

  // ── ROME (deep) ────────────────────────────────────────────
  { hotelKey: 'g187791-d232759', name: 'Hotel Eden Rome',                city: 'Rome',       country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187791-d232698', name: 'Hotel de Russie Rome',           city: 'Rome',       country: 'Italy',       image: img('Rome') },
  { hotelKey: 'g187791-d238801', name: 'The St. Regis Rome',             city: 'Rome',       country: 'Italy',       image: img('Rome') },

  // ── BARCELONA (deep) ──────────────────────────────────────
  { hotelKey: 'g187497-d231105', name: 'Hotel Arts Barcelona',           city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },
  { hotelKey: 'g187497-d189413', name: 'Mandarin Oriental Barcelona',    city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },
  { hotelKey: 'g187497-d229049', name: 'The Serras Barcelona',           city: 'Barcelona',  country: 'Spain',       image: img('Barcelona') },

  // ── ISTANBUL (deep) ───────────────────────────────────────
  { hotelKey: 'g293974-d312890', name: 'Shangri-La Bosphorus Istanbul',  city: 'Istanbul',   country: 'Turkey',      image: img('Istanbul') },
  { hotelKey: 'g293974-d306783', name: 'Raffles Istanbul',               city: 'Istanbul',   country: 'Turkey',      image: img('Istanbul') },
  { hotelKey: 'g293974-d313128', name: 'The Ritz-Carlton Istanbul',      city: 'Istanbul',   country: 'Turkey',      image: img('Istanbul') },

  // ── AMSTERDAM (deep) ──────────────────────────────────────
  { hotelKey: 'g188590-d250027', name: 'Waldorf Astoria Amsterdam',      city: 'Amsterdam',  country: 'Netherlands', image: img('Amsterdam') },
  { hotelKey: 'g188590-d190832', name: 'Conservatorium Hotel Amsterdam', city: 'Amsterdam',  country: 'Netherlands', image: img('Amsterdam') },

  // ── SYDNEY (deep) ─────────────────────────────────────────
  { hotelKey: 'g255060-d256639', name: 'Four Seasons Hotel Sydney',      city: 'Sydney',     country: 'Australia',   image: img('Sydney') },
  { hotelKey: 'g255060-d256574', name: 'Shangri-La Sydney',              city: 'Sydney',     country: 'Australia',   image: img('Sydney') },
  { hotelKey: 'g255060-d257032', name: 'The Langham Sydney',             city: 'Sydney',     country: 'Australia',   image: img('Sydney') },

  // ── PRAGUE (deep) ─────────────────────────────────────────
  { hotelKey: 'g274707-d275508', name: 'Four Seasons Hotel Prague',      city: 'Prague',     country: 'Czech Republic', image: img('Prague') },
  { hotelKey: 'g274707-d277222', name: 'The Augustine Prague',           city: 'Prague',     country: 'Czech Republic', image: img('Prague') },

  // ── MIAMI (deep) ──────────────────────────────────────────
  { hotelKey: 'g34438-d84015',   name: 'Four Seasons Surf Club Miami',   city: 'Miami',      country: 'USA',         image: img('Miami') },
  { hotelKey: 'g34438-d97820',   name: 'The Setai Miami Beach',          city: 'Miami',      country: 'USA',         image: img('Miami') },
  { hotelKey: 'g34438-d84163',   name: 'Faena Hotel Miami Beach',        city: 'Miami',      country: 'USA',         image: img('Miami') },
  { hotelKey: 'g34438-d84237',   name: 'The Ritz-Carlton South Beach',   city: 'Miami',      country: 'USA',         image: img('Miami') },

  // ── LAS VEGAS (deep) ──────────────────────────────────────
  { hotelKey: 'g45963-d91891',   name: 'The Venetian Resort',            city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },
  { hotelKey: 'g45963-d77079',   name: 'Wynn Las Vegas',                 city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },
  { hotelKey: 'g45963-d97704',   name: 'Encore at Wynn Las Vegas',       city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },
  { hotelKey: 'g45963-d91736',   name: 'Bellagio Las Vegas',             city: 'Las Vegas',  country: 'USA',         image: img('Las Vegas') },

  // ── ATHENS (deep) ─────────────────────────────────────────
  { hotelKey: 'g189400-d195458', name: 'Hotel Grande Bretagne Athens',   city: 'Athens',     country: 'Greece',      image: img('Athens') },
  { hotelKey: 'g189400-d275055', name: 'King George Athens',             city: 'Athens',     country: 'Greece',      image: img('Athens') },
  { hotelKey: 'g189400-d236862', name: 'Four Seasons Astir Palace Athens',city: 'Athens',    country: 'Greece',      image: img('Athens') },

  // ── TEL AVIV (deep) ───────────────────────────────────────
  { hotelKey: 'g293984-d306073', name: 'The Setai Tel Aviv',             city: 'Tel Aviv',   country: 'Israel',      image: img('Tel Aviv') },
  { hotelKey: 'g293984-d1175022',name: 'The Jaffa Hotel',                city: 'Tel Aviv',   country: 'Israel',      image: img('Tel Aviv') },

  // ═══════════════════════════════════════════════════════════
  // NEW CITIES — Phase 2
  // ═══════════════════════════════════════════════════════════

  // ── LISBON (deep) ─────────────────────────────────────────
  { hotelKey: 'g189158-d232534', name: 'Four Seasons Hotel Ritz Lisbon', city: 'Lisbon',     country: 'Portugal',    image: img('Lisbon') },
  { hotelKey: 'g189158-d224530', name: 'Palácio Principe Real Lisbon',   city: 'Lisbon',     country: 'Portugal',    image: img('Lisbon') },

  // ── BALI (deep) ───────────────────────────────────────────
  { hotelKey: 'g297698-d302197', name: 'The St. Regis Bali Resort',      city: 'Bali',       country: 'Indonesia',   image: img('Bali') },
  { hotelKey: 'g297698-d301193', name: 'Mandapa Ritz-Carlton Bali',      city: 'Bali',       country: 'Indonesia',   image: img('Bali') },
  { hotelKey: 'g297698-d300673', name: 'Ayana Resort Bali',              city: 'Bali',       country: 'Indonesia',   image: img('Bali') },

  // ── BUDAPEST (deep) ───────────────────────────────────────
  { hotelKey: 'g274887-d277582', name: 'Four Seasons Gresham Palace',    city: 'Budapest',   country: 'Hungary',     image: img('Budapest') },
  { hotelKey: 'g274887-d1137329',name: 'The Ritz-Carlton Budapest',      city: 'Budapest',   country: 'Hungary',     image: img('Budapest') },

  // ── BERLIN (deep) ─────────────────────────────────────────
  { hotelKey: 'g187323-d191846', name: 'Hotel Adlon Kempinski Berlin',   city: 'Berlin',     country: 'Germany',     image: img('Berlin') },
  { hotelKey: 'g187323-d637015', name: 'The Ritz-Carlton Berlin',        city: 'Berlin',     country: 'Germany',     image: img('Berlin') },

  // ── CAIRO (deep) ──────────────────────────────────────────
  { hotelKey: 'g294201-d303846', name: 'Four Seasons Cairo at the First Residence',city: 'Cairo',country: 'Egypt',   image: img('Cairo') },
  { hotelKey: 'g294201-d320048', name: 'The St. Regis Cairo',            city: 'Cairo',      country: 'Egypt',       image: img('Cairo') },

  // ── SEOUL (deep) ──────────────────────────────────────────
  { hotelKey: 'g294197-d299561', name: 'The Shilla Seoul',               city: 'Seoul',      country: 'South Korea', image: img('Seoul') },
  { hotelKey: 'g294197-d575803', name: 'Four Seasons Hotel Seoul',       city: 'Seoul',      country: 'South Korea', image: img('Seoul') },

  // ── TORONTO (deep) ────────────────────────────────────────
  { hotelKey: 'g155019-d155495', name: 'Four Seasons Hotel Toronto',     city: 'Toronto',    country: 'Canada',      image: img('Toronto') },
  { hotelKey: 'g155019-d181726', name: 'Shangri-La Hotel Toronto',       city: 'Toronto',    country: 'Canada',      image: img('Toronto') },

  // ── NEW CITIES ────────────────────────────────────────────

  // ── BOSTON ──
  { hotelKey: 'g60745-d89590',   name: 'Four Seasons Hotel Boston',      city: 'Boston',     country: 'USA',         image: img('Boston') },
  { hotelKey: 'g60745-d89587',   name: 'Mandarin Oriental Boston',       city: 'Boston',     country: 'USA',         image: img('Boston') },
  { hotelKey: 'g60745-d91526',   name: 'The Liberty Boston',             city: 'Boston',     country: 'USA',         image: img('Boston') },

  // ── SEATTLE ──
  { hotelKey: 'g60878-d108377',  name: 'Four Seasons Hotel Seattle',     city: 'Seattle',    country: 'USA',         image: img('Seattle') },
  { hotelKey: 'g60878-d80445',   name: 'Fairmont Olympic Hotel Seattle', city: 'Seattle',    country: 'USA',         image: img('Seattle') },
  { hotelKey: 'g60878-d96901',   name: 'Thompson Seattle',               city: 'Seattle',    country: 'USA',         image: img('Seattle') },

  // ── MONTREAL ──
  { hotelKey: 'g155032-d155486', name: 'Fairmont The Queen Elizabeth Montreal', city: 'Montreal',country: 'Canada',  image: img('Montreal') },
  { hotelKey: 'g155032-d155512', name: 'Ritz-Carlton Montreal',          city: 'Montreal',   country: 'Canada',      image: img('Montreal') },
  { hotelKey: 'g155032-d155483', name: 'Hotel Le St-James Montreal',     city: 'Montreal',   country: 'Canada',      image: img('Montreal') },

  // ── VANCOUVER ──
  { hotelKey: 'g154943-d155423', name: 'Fairmont Pacific Rim Vancouver', city: 'Vancouver',  country: 'Canada',      image: img('Vancouver') },
  { hotelKey: 'g154943-d155419', name: 'Rosewood Hotel Georgia Vancouver',city: 'Vancouver', country: 'Canada',      image: img('Vancouver') },
  { hotelKey: 'g154943-d155414', name: 'Shangri-La Hotel Vancouver',     city: 'Vancouver',  country: 'Canada',      image: img('Vancouver') },

  // ── LIMA ──
  { hotelKey: 'g294316-d309151', name: 'Belmond Miraflores Park Lima',   city: 'Lima',       country: 'Peru',        image: img('Lima') },
  { hotelKey: 'g294316-d315105', name: 'JW Marriott Hotel Lima',         city: 'Lima',       country: 'Peru',        image: img('Lima') },
  { hotelKey: 'g294316-d2059011',name: 'Hotel B Lima',                   city: 'Lima',       country: 'Peru',        image: img('Lima') },

  // ── BOGOTA ──
  { hotelKey: 'g294074-d309461', name: 'Four Seasons Hotel Bogota',      city: 'Bogota',     country: 'Colombia',    image: img('Bogota') },
  { hotelKey: 'g294074-d308991', name: 'JW Marriott Hotel Bogota',       city: 'Bogota',     country: 'Colombia',    image: img('Bogota') },
  { hotelKey: 'g294074-d579581', name: 'W Bogota',                       city: 'Bogota',     country: 'Colombia',    image: img('Bogota') },

  // ── CARTAGENA ──
  { hotelKey: 'g297476-d306427', name: 'Sofitel Legend Santa Clara Cartagena',city: 'Cartagena',country: 'Colombia', image: img('Cartagena') },
  { hotelKey: 'g297476-d602024', name: 'Four Seasons Hotel Cartagena',   city: 'Cartagena',  country: 'Colombia',    image: img('Cartagena') },

  // ── CAPE TOWN (deep) ──────────────────────────────────────
  { hotelKey: 'g1722390-d1759690',name: 'One&Only Cape Town',            city: 'Cape Town',  country: 'South Africa',image: img('Cape Town') },
  { hotelKey: 'g1722390-d258489', name: 'Belmond Mount Nelson Hotel',    city: 'Cape Town',  country: 'South Africa',image: img('Cape Town') },

  // ── JOHANNESBURG ──
  { hotelKey: 'g312578-d306371', name: 'The Saxon Hotel Johannesburg',   city: 'Johannesburg',country: 'South Africa',image: img('Johannesburg') },
  { hotelKey: 'g312578-d304977', name: 'Four Seasons Westcliff Johannesburg',city: 'Johannesburg',country: 'South Africa',image: img('Johannesburg') },

  // ── CASABLANCA ──
  { hotelKey: 'g293732-d305001', name: 'Four Seasons Hotel Casablanca',  city: 'Casablanca', country: 'Morocco',     image: img('Casablanca') },
  { hotelKey: 'g293732-d299538', name: 'Le Royal Mansour Casablanca',    city: 'Casablanca', country: 'Morocco',     image: img('Casablanca') },

  // ── DAR ES SALAAM ──
  { hotelKey: 'g293748-d302440', name: 'Hyatt Regency Dar es Salaam',    city: 'Dar es Salaam',country: 'Tanzania',  image: img('Dar es Salaam') },
  { hotelKey: 'g293748-d520655', name: 'Slipway Hotel Dar es Salaam',    city: 'Dar es Salaam',country: 'Tanzania',  image: img('Dar es Salaam') },

  // ── ZANZIBAR ──
  { hotelKey: 'g482893-d613543', name: 'Park Hyatt Zanzibar',            city: 'Zanzibar',   country: 'Tanzania',    image: img('Zanzibar') },
  { hotelKey: 'g482893-d603262', name: 'The Residence Zanzibar',         city: 'Zanzibar',   country: 'Tanzania',    image: img('Zanzibar') },

  // ── MAURITIUS ──
  { hotelKey: 'g293816-d302091', name: 'One&Only Le Saint Géran Mauritius',city: 'Mauritius', country: 'Mauritius',   image: img('Mauritius') },
  { hotelKey: 'g293816-d302107', name: 'Shangri-La Le Touessrok Mauritius',city: 'Mauritius', country: 'Mauritius',   image: img('Mauritius') },
  { hotelKey: 'g293816-d302095', name: 'The Oberoi Beach Resort Mauritius',city: 'Mauritius', country: 'Mauritius',   image: img('Mauritius') },

  // ── PHUKET (deep) ─────────────────────────────────────────
  { hotelKey: 'g297930-d309157', name: 'Trisara Phuket',                 city: 'Phuket',     country: 'Thailand',    image: img('Phuket') },
  { hotelKey: 'g297930-d580703', name: 'Rosewood Phuket',                city: 'Phuket',     country: 'Thailand',    image: img('Phuket') },

  // ── CHIANG MAI ──
  { hotelKey: 'g293917-d307843', name: 'Four Seasons Chiang Mai',        city: 'Chiang Mai',  country: 'Thailand',   image: img('Chiang Mai') },
  { hotelKey: 'g293917-d635327', name: 'Anantara Chiang Mai Resort',     city: 'Chiang Mai',  country: 'Thailand',   image: img('Chiang Mai') },
  { hotelKey: 'g293917-d302308', name: 'Dhara Dhevi Chiang Mai',         city: 'Chiang Mai',  country: 'Thailand',   image: img('Chiang Mai') },

  // ── KUALA LUMPUR (deep) ────────────────────────────────────
  { hotelKey: 'g298570-d306948', name: 'Four Seasons Hotel Kuala Lumpur',city: 'Kuala Lumpur',country: 'Malaysia',    image: img('Kuala Lumpur') },
  { hotelKey: 'g298570-d1123970',name: 'The RuMa Hotel Kuala Lumpur',    city: 'Kuala Lumpur',country: 'Malaysia',    image: img('Kuala Lumpur') },

  // ── HONG KONG (deep) ──────────────────────────────────────
  { hotelKey: 'g294217-d308799', name: 'Rosewood Hong Kong',             city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
  { hotelKey: 'g294217-d302088', name: 'The Upper House Hong Kong',      city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
  { hotelKey: 'g294217-d299537', name: 'Mandarin Oriental Hong Kong',    city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },

  // ── SHANGHAI ──
  { hotelKey: 'g308272-d587176', name: 'The Peninsula Shanghai',         city: 'Shanghai',   country: 'China',       image: img('Shanghai') },
  { hotelKey: 'g308272-d574994', name: 'Mandarin Oriental Pudong Shanghai',city: 'Shanghai', country: 'China',       image: img('Shanghai') },
  { hotelKey: 'g308272-d307610', name: 'Waldorf Astoria Shanghai',       city: 'Shanghai',   country: 'China',       image: img('Shanghai') },
  { hotelKey: 'g308272-d308040', name: 'The Bund Hotel Shanghai',        city: 'Shanghai',   country: 'China',       image: img('Shanghai') },

  // ── BEIJING ──
  { hotelKey: 'g294212-d306196', name: 'Aman at Summer Palace Beijing',  city: 'Beijing',    country: 'China',       image: img('Beijing') },
  { hotelKey: 'g294212-d587178', name: 'The Peninsula Beijing',          city: 'Beijing',    country: 'China',       image: img('Beijing') },
  { hotelKey: 'g294212-d304023', name: 'Waldorf Astoria Beijing',        city: 'Beijing',    country: 'China',       image: img('Beijing') },

  // ── TAIPEI ──
  { hotelKey: 'g293913-d573071', name: 'Mandarin Oriental Taipei',       city: 'Taipei',     country: 'Taiwan',      image: img('Taipei') },
  { hotelKey: 'g293913-d302050', name: 'The Grand Hotel Taipei',         city: 'Taipei',     country: 'Taiwan',      image: img('Taipei') },
  { hotelKey: 'g293913-d1039800', name: 'W Taipei',                      city: 'Taipei',     country: 'Taiwan',      image: img('Taipei') },

  // ── HO CHI MINH CITY ──
  { hotelKey: 'g293925-d304069', name: 'Park Hyatt Saigon',              city: 'Ho Chi Minh City',country: 'Vietnam',image: img('Ho Chi Minh City') },
  { hotelKey: 'g293925-d306093', name: 'The Reverie Saigon',             city: 'Ho Chi Minh City',country: 'Vietnam',image: img('Ho Chi Minh City') },
  { hotelKey: 'g293925-d305062', name: 'Hotel Des Arts Saigon',          city: 'Ho Chi Minh City',country: 'Vietnam',image: img('Ho Chi Minh City') },

  // ── COLOMBO (deep) ────────────────────────────────────────
  { hotelKey: 'g293962-d302067', name: 'Galle Face Hotel Colombo',       city: 'Colombo',    country: 'Sri Lanka',   image: img('Colombo') },

  // ── NEW DELHI (deep) ──────────────────────────────────────
  { hotelKey: 'g304551-d307154', name: 'The Lodhi New Delhi',            city: 'New Delhi',  country: 'India',       image: img('New Delhi') },
  { hotelKey: 'g304551-d305023', name: 'The Leela Palace New Delhi',     city: 'New Delhi',  country: 'India',       image: img('New Delhi') },
  { hotelKey: 'g304551-d305128', name: 'The Imperial New Delhi',         city: 'New Delhi',  country: 'India',       image: img('New Delhi') },

  // ── JAIPUR (deep) ─────────────────────────────────────────
  { hotelKey: 'g304555-d305014', name: 'The Oberoi Rajvilas Jaipur',     city: 'Jaipur',     country: 'India',       image: img('Jaipur') },
  { hotelKey: 'g304555-d306944', name: 'Rambagh Palace Jaipur',          city: 'Jaipur',     country: 'India',       image: img('Jaipur') },
  { hotelKey: 'g304555-d454828', name: 'Fairmont Jaipur',                city: 'Jaipur',     country: 'India',       image: img('Jaipur') },

  // ── UDAIPUR ──
  { hotelKey: 'g297672-d308023', name: 'The Oberoi Udaivilas Udaipur',   city: 'Udaipur',    country: 'India',       image: img('Udaipur') },
  { hotelKey: 'g297672-d302212', name: 'Taj Lake Palace Udaipur',        city: 'Udaipur',    country: 'India',       image: img('Udaipur') },
  { hotelKey: 'g297672-d306934', name: 'The Leela Palace Udaipur',       city: 'Udaipur',    country: 'India',       image: img('Udaipur') },

  // ── GOA ──
  { hotelKey: 'g303877-d306958', name: 'Taj Exotica Resort Goa',         city: 'Goa',        country: 'India',       image: img('Goa') },
  { hotelKey: 'g303877-d301050', name: 'Park Hyatt Goa Resort',          city: 'Goa',        country: 'India',       image: img('Goa') },

  // ── LYON ──
  { hotelKey: 'g187265-d200925', name: 'InterContinental Lyon Hotel Dieu',city: 'Lyon',      country: 'France',      image: img('Lyon') },
  { hotelKey: 'g187265-d233020', name: 'Cour des Loges Lyon',            city: 'Lyon',       country: 'France',      image: img('Lyon') },
  { hotelKey: 'g187265-d233011', name: 'Villa Florentine Lyon',          city: 'Lyon',       country: 'France',      image: img('Lyon') },

  // ── CANNES ──
  { hotelKey: 'g187221-d228608', name: 'Hotel Martinez Cannes',          city: 'Cannes',     country: 'France',      image: img('Cannes') },
  { hotelKey: 'g187221-d233505', name: 'InterContinental Carlton Cannes',city: 'Cannes',     country: 'France',      image: img('Cannes') },
  { hotelKey: 'g187221-d245632', name: 'JW Marriott Cannes',             city: 'Cannes',     country: 'France',      image: img('Cannes') },

  // ── NAPLES ──
  { hotelKey: 'g187785-d230449', name: 'Grand Hotel Vesuvio Naples',     city: 'Naples',     country: 'Italy',       image: img('Naples') },
  { hotelKey: 'g187785-d240085', name: 'Hotel Excelsior Naples',         city: 'Naples',     country: 'Italy',       image: img('Naples') },

  // ── AMALFI COAST ──
  { hotelKey: 'g187779-d231060', name: 'Belmond Hotel Caruso Amalfi',    city: 'Amalfi Coast',country: 'Italy',      image: img('Amalfi Coast') },
  { hotelKey: 'g194878-d231193', name: 'Le Sirenuse Positano',           city: 'Amalfi Coast',country: 'Italy',      image: img('Amalfi Coast') },
  { hotelKey: 'g194878-d246290', name: 'Hotel Santa Caterina Amalfi',    city: 'Amalfi Coast',country: 'Italy',      image: img('Amalfi Coast') },

  // ── HAMBURG ──
  { hotelKey: 'g187331-d278310', name: 'Fairmont Hotel Vier Jahreszeiten Hamburg',city: 'Hamburg',country: 'Germany', image: img('Hamburg') },
  { hotelKey: 'g187331-d256032', name: 'The Fontenay Hamburg',           city: 'Hamburg',    country: 'Germany',     image: img('Hamburg') },

  // ── FRANKFURT ──
  { hotelKey: 'g187337-d192066', name: 'Jumeirah Frankfurt',             city: 'Frankfurt',  country: 'Germany',     image: img('Frankfurt') },
  { hotelKey: 'g187337-d232948', name: 'Villa Kennedy Frankfurt',        city: 'Frankfurt',  country: 'Germany',     image: img('Frankfurt') },

  // ── BRUGES ──
  { hotelKey: 'g188671-d228362', name: 'Hotel Dukes Palace Bruges',      city: 'Bruges',     country: 'Belgium',     image: img('Bruges') },
  { hotelKey: 'g188671-d233640', name: 'Relais Bourgondisch Cruyce',     city: 'Bruges',     country: 'Belgium',     image: img('Bruges') },

  // ── BRUSSELS ──
  { hotelKey: 'g188644-d228339', name: 'Hotel Amigo Brussels',           city: 'Brussels',   country: 'Belgium',     image: img('Brussels') },
  { hotelKey: 'g188644-d299720', name: 'The Dominican Brussels',         city: 'Brussels',   country: 'Belgium',     image: img('Brussels') },

  // ── GENEVA ──
  { hotelKey: 'g188057-d228403', name: 'Four Seasons Hotel des Bergues Geneva',city: 'Geneva',country: 'Switzerland',image: img('Geneva') },
  { hotelKey: 'g188057-d228407', name: 'Beau-Rivage Geneva',             city: 'Geneva',     country: 'Switzerland', image: img('Geneva') },
  { hotelKey: 'g188057-d257001', name: 'The Ritz-Carlton Hotel de la Paix Geneva',city: 'Geneva',country: 'Switzerland',image: img('Geneva') },

  // ── TALLINN ──
  { hotelKey: 'g274958-d277780', name: 'Hotel Telegraaf Tallinn',        city: 'Tallinn',    country: 'Estonia',     image: img('Tallinn') },
  { hotelKey: 'g274958-d276889', name: 'Hotel Schlössle Tallinn',        city: 'Tallinn',    country: 'Estonia',     image: img('Tallinn') },

  // ── REYKJAVIK ──
  { hotelKey: 'g189970-d228247', name: 'Hotel Borg Reykjavik',           city: 'Reykjavik',  country: 'Iceland',     image: img('Reykjavik') },
  { hotelKey: 'g189970-d1478927',name: 'The Reykjavik Edition',          city: 'Reykjavik',  country: 'Iceland',     image: img('Reykjavik') },

  // ── OSLO ──
  { hotelKey: 'g190479-d228254', name: 'Hotel Continental Oslo',         city: 'Oslo',       country: 'Norway',      image: img('Oslo') },
  { hotelKey: 'g190479-d228261', name: 'Grand Hotel Oslo',               city: 'Oslo',       country: 'Norway',      image: img('Oslo') },

  // ── CUSCO ──
  { hotelKey: 'g294314-d309103', name: 'Belmond Hotel Monasterio Cusco', city: 'Cusco',      country: 'Peru',        image: img('Cusco') },
  { hotelKey: 'g294314-d305076', name: 'JW Marriott El Convento Cusco',  city: 'Cusco',      country: 'Peru',        image: img('Cusco') },

  // ── SANTIAGO ──
  { hotelKey: 'g294305-d306395', name: 'The Ritz-Carlton Santiago',      city: 'Santiago',   country: 'Chile',       image: img('Santiago') },
  { hotelKey: 'g294305-d315072', name: 'W Santiago',                     city: 'Santiago',   country: 'Chile',       image: img('Santiago') },
  { hotelKey: 'g294305-d584618', name: 'Mandarin Oriental Santiago',     city: 'Santiago',   country: 'Chile',       image: img('Santiago') },

  // ── BAHRAIN ──
  { hotelKey: 'g293996-d307009', name: 'Four Seasons Hotel Bahrain Bay', city: 'Manama',     country: 'Bahrain',     image: img('Manama') },
  { hotelKey: 'g293996-d302012', name: 'The Ritz-Carlton Bahrain',       city: 'Manama',     country: 'Bahrain',     image: img('Manama') },

  // ── KUWAIT ──
  { hotelKey: 'g294004-d302020', name: 'Four Seasons Hotel Kuwait',      city: 'Kuwait City',country: 'Kuwait',      image: img('Kuwait City') },
  { hotelKey: 'g294004-d305044', name: 'JW Marriott Hotel Kuwait City',  city: 'Kuwait City',country: 'Kuwait',      image: img('Kuwait City') },

  // ── ADDIS ABABA ──
  { hotelKey: 'g293791-d1936989',name: 'Hyatt Regency Addis Ababa',      city: 'Addis Ababa',country: 'Ethiopia',    image: img('Addis Ababa') },
  { hotelKey: 'g293791-d6478553',name: 'Sheraton Addis Ababa',           city: 'Addis Ababa',country: 'Ethiopia',    image: img('Addis Ababa') },

  // ── LAGOS ──
  { hotelKey: 'g304026-d2087040',name: 'Eko Hotel Lagos',                city: 'Lagos',      country: 'Nigeria',     image: img('Lagos') },
  { hotelKey: 'g304026-d3495610',name: 'Lagos Continental Hotel',        city: 'Lagos',      country: 'Nigeria',     image: img('Lagos') },

  // ── ACCRA ──
  { hotelKey: 'g293797-d302010', name: 'Kempinski Hotel Gold Coast Accra',city: 'Accra',     country: 'Ghana',       image: img('Accra') },
  { hotelKey: 'g293797-d636985', name: 'Labadi Beach Hotel Accra',       city: 'Accra',      country: 'Ghana',       image: img('Accra') },

  // ── COLOMBIAN/PERUVIAN DEEP ────────────────────────────────
  { hotelKey: 'g303862-d308998', name: 'Inkaterra Machu Picchu Pueblo',  city: 'Machu Picchu',country: 'Peru',       image: img('Machu Picchu') },

  // ── AUCKLAND ──
  { hotelKey: 'g255106-d256645', name: 'The Langham Auckland',           city: 'Auckland',   country: 'New Zealand', image: img('Auckland') },
  { hotelKey: 'g255106-d576024', name: 'Park Hyatt Auckland',            city: 'Auckland',   country: 'New Zealand', image: img('Auckland') },
  { hotelKey: 'g255106-d257100', name: 'Hotel DeBrett Auckland',         city: 'Auckland',   country: 'New Zealand', image: img('Auckland') },

  // ── QUEENSTOWN ──
  { hotelKey: 'g255122-d258021', name: 'Sofitel Queenstown Hotel',       city: 'Queenstown', country: 'New Zealand', image: img('Queenstown') },
  { hotelKey: 'g255122-d257127', name: 'Eichardt\'s Private Hotel',      city: 'Queenstown', country: 'New Zealand', image: img('Queenstown') },

  // ── FIJI ──
  { hotelKey: 'g294331-d310215', name: 'Six Senses Fiji',                city: 'Fiji',       country: 'Fiji',        image: img('Fiji') },
  { hotelKey: 'g294331-d310203', name: 'Kokomo Island Fiji',             city: 'Fiji',       country: 'Fiji',        image: img('Fiji') },

  // ═══════════════════════════════════════════════════════════
  // FINAL PUSH — 500+ target
  // ═══════════════════════════════════════════════════════════

  // ── SCOTTSDALE / PHOENIX ──
  { hotelKey: 'g31350-d73243',   name: 'The Phoenician Scottsdale',      city: 'Scottsdale', country: 'USA',         image: img('Scottsdale') },
  { hotelKey: 'g31350-d74263',   name: 'Four Seasons Scottsdale',        city: 'Scottsdale', country: 'USA',         image: img('Scottsdale') },

  // ── AUSTIN ──
  { hotelKey: 'g30196-d80610',   name: 'Four Seasons Hotel Austin',      city: 'Austin',     country: 'USA',         image: img('Austin') },
  { hotelKey: 'g30196-d73005',   name: 'Hotel Driskill Austin',          city: 'Austin',     country: 'USA',         image: img('Austin') },

  // ── NASHVILLE ──
  { hotelKey: 'g55229-d93400',   name: 'The Hermitage Hotel Nashville',  city: 'Nashville',  country: 'USA',         image: img('Nashville') },
  { hotelKey: 'g55229-d80316',   name: 'The Joseph Nashville',           city: 'Nashville',  country: 'USA',         image: img('Nashville') },

  // ── HAWAII ──
  { hotelKey: 'g60654-d87063',   name: 'Four Seasons Maui at Wailea',    city: 'Maui',       country: 'USA',         image: img('Maui') },
  { hotelKey: 'g60982-d112757',  name: 'Halekulani Hotel Waikiki',       city: 'Honolulu',   country: 'USA',         image: img('Honolulu') },
  { hotelKey: 'g60982-d87155',   name: 'The Royal Hawaiian Waikiki',     city: 'Honolulu',   country: 'USA',         image: img('Honolulu') },

  // ── SAN DIEGO ──
  { hotelKey: 'g60750-d99346',   name: 'Hotel del Coronado San Diego',   city: 'San Diego',  country: 'USA',         image: img('San Diego') },
  { hotelKey: 'g60750-d84120',   name: 'Fairmont Grand Del Mar',         city: 'San Diego',  country: 'USA',         image: img('San Diego') },

  // ── BATUMI (Georgia) ──
  { hotelKey: 'g297889-d305081', name: 'Hilton Batumi',                  city: 'Batumi',     country: 'Georgia',     image: img('Batumi') },
  { hotelKey: 'g297889-d8088017',name: 'Paragraph Resort Batumi',        city: 'Batumi',     country: 'Georgia',     image: img('Batumi') },

  // ── TBILISI ──
  { hotelKey: 'g297899-d306056', name: 'Rooms Hotel Tbilisi',            city: 'Tbilisi',    country: 'Georgia',     image: img('Tbilisi') },
  { hotelKey: 'g297899-d7380003',name: 'Stamba Hotel Tbilisi',           city: 'Tbilisi',    country: 'Georgia',     image: img('Tbilisi') },

  // ── VILNIUS ──
  { hotelKey: 'g274951-d277752', name: 'Hotel Pacai Vilnius',            city: 'Vilnius',    country: 'Lithuania',   image: img('Vilnius') },
  { hotelKey: 'g274951-d1221880',name: 'The Grand Hotel Kempinski Vilnius',city: 'Vilnius',  country: 'Lithuania',   image: img('Vilnius') },

  // ── PORTO (deep) ──
  { hotelKey: 'g189180-d233056', name: 'The Yeatman Porto',              city: 'Porto',      country: 'Portugal',    image: img('Porto') },
  { hotelKey: 'g189180-d232537', name: 'InterContinental Porto',         city: 'Porto',      country: 'Portugal',    image: img('Porto') },

  // ── SPLIT ──
  { hotelKey: 'g295370-d580018', name: 'Hotel Lešić Dimitri Palace Split',city: 'Split',     country: 'Croatia',     image: img('Split') },
  { hotelKey: 'g295370-d302081', name: 'Hotel Park Split',               city: 'Split',      country: 'Croatia',     image: img('Split') },

  // ── MYKONOS ──
  { hotelKey: 'g189461-d1073547',name: 'Cavo Tagoo Mykonos',             city: 'Mykonos',    country: 'Greece',      image: img('Mykonos') },
  { hotelKey: 'g189461-d1147456',name: 'Kalesma Mykonos',                city: 'Mykonos',    country: 'Greece',      image: img('Mykonos') },

  // ── CRETE ──
  { hotelKey: 'g189413-d233069', name: 'Blue Palace Resort Crete',       city: 'Crete',      country: 'Greece',      image: img('Crete') },
  { hotelKey: 'g189413-d1146889',name: 'Domes of Elounda Crete',         city: 'Crete',      country: 'Greece',      image: img('Crete') },

  // ── SALZBURG ──
  { hotelKey: 'g190441-d228303', name: 'Hotel Sacher Salzburg',          city: 'Salzburg',   country: 'Austria',     image: img('Salzburg') },
  { hotelKey: 'g190441-d228279', name: 'Hotel Goldener Hirsch Salzburg', city: 'Salzburg',   country: 'Austria',     image: img('Salzburg') },

  // ── SINGAPORE (ultra deep) ────────────────────────────────
  { hotelKey: 'g294265-d306115', name: 'Shangri-La Singapore',           city: 'Singapore',  country: 'Singapore',   image: img('Singapore') },

  // ── IBIZA ──
  { hotelKey: 'g187460-d244762', name: 'Nobu Hotel Ibiza Bay',           city: 'Ibiza',      country: 'Spain',       image: img('Ibiza') },
  { hotelKey: 'g187460-d230107', name: 'Aguas de Ibiza Grand Luxe Hotel',city: 'Ibiza',      country: 'Spain',       image: img('Ibiza') },

  // ── PALMA DE MALLORCA ──
  { hotelKey: 'g187463-d231122', name: 'Hotel Can Alomar Palma',         city: 'Palma de Mallorca',country: 'Spain',  image: img('Palma de Mallorca') },
  { hotelKey: 'g187463-d231143', name: 'Hotel Sant Francesc Palma',      city: 'Palma de Mallorca',country: 'Spain',  image: img('Palma de Mallorca') },

  // ── TULUM ──
  { hotelKey: 'g150813-d3254050',name: 'Hotel Esencia Tulum',            city: 'Tulum',      country: 'Mexico',      image: img('Tulum') },
  { hotelKey: 'g150813-d7317379',name: 'Kanan Tulum',                    city: 'Tulum',      country: 'Mexico',      image: img('Tulum') },

  // ── MEDELLÍN ──
  { hotelKey: 'g297478-d635297', name: 'The Charlee Hotel Medellín',     city: 'Medellín',   country: 'Colombia',    image: img('Medellín') },
  { hotelKey: 'g297478-d480655', name: 'Hotel Dann Carlton Medellín',    city: 'Medellín',   country: 'Colombia',    image: img('Medellín') },
];

// ── Pre-computed indexes (built once at module load, O(1) lookups) ──

/** @typedef {typeof HOTELS[number]} Hotel */
/** @type {Map<string, Hotel>} */
const INDEX_BY_KEY = new Map(HOTELS.map((h) => [h.hotelKey, h]));
/** @type {Map<string, Hotel[]>} */
const INDEX_BY_CITY = new Map();
/** @type {Map<string, Hotel[]>} */
const INDEX_BY_COUNTRY = new Map();

// Pre-lowercased search strings for fast text search
const SEARCH_ENTRIES = HOTELS.map((h) => ({
  hotel: h,
  searchStr: `${h.name}\t${h.city}\t${h.country}`.toLowerCase(),
}));

for (const h of HOTELS) {
  const cityKey = h.city.toLowerCase();
  const countryKey = h.country.toLowerCase();
  if (!INDEX_BY_CITY.has(cityKey)) INDEX_BY_CITY.set(cityKey, []);
  INDEX_BY_CITY.get(cityKey).push(h);
  if (!INDEX_BY_COUNTRY.has(countryKey)) INDEX_BY_COUNTRY.set(countryKey, []);
  INDEX_BY_COUNTRY.get(countryKey).push(h);
}

const CONTINENT_COUNTRIES = {
  'middle-east': ['israel', 'uae', 'turkey', 'egypt', 'saudi arabia', 'qatar', 'jordan', 'oman', 'bahrain', 'kuwait'],
  'asia': ['thailand', 'japan', 'singapore', 'indonesia', 'south korea', 'india', 'malaysia', 'sri lanka', 'china', 'vietnam', 'maldives', 'taiwan'],
  'europe': ['france', 'united kingdom', 'italy', 'spain', 'netherlands', 'czech republic', 'austria', 'germany', 'greece', 'hungary', 'croatia', 'portugal', 'finland', 'ireland', 'switzerland', 'denmark', 'sweden', 'poland', 'belgium', 'estonia', 'iceland', 'norway', 'georgia', 'lithuania'],
  'americas': ['usa', 'brazil', 'canada', 'mexico', 'argentina', 'peru', 'colombia', 'chile'],
  'africa': ['kenya', 'morocco', 'south africa', 'tanzania', 'mauritius', 'ethiopia', 'nigeria', 'ghana'],
  'oceania': ['australia', 'new zealand', 'fiji'],
};

// Pre-build continent → hotels index
/** @type {Map<string, Hotel[]>} */
const INDEX_BY_CONTINENT = new Map();
for (const [continentId, countries] of Object.entries(CONTINENT_COUNTRIES)) {
  const hotels = [];
  for (const c of countries) {
    const countryHotels = INDEX_BY_COUNTRY.get(c);
    if (countryHotels) hotels.push(...countryHotels);
  }
  INDEX_BY_CONTINENT.set(continentId, hotels);
}

const SORTED_CITIES = Array.from(INDEX_BY_CITY.keys()).sort().map((k) => {
  const h = INDEX_BY_CITY.get(k)[0];
  return h.city; // original casing
});
const SORTED_COUNTRIES = Array.from(INDEX_BY_COUNTRY.keys()).sort().map((k) => {
  const h = INDEX_BY_COUNTRY.get(k)[0];
  return h.country;
});

// ── Public API ──

export function listCities() {
  return SORTED_CITIES;
}

export function listCountries() {
  return SORTED_COUNTRIES;
}

export function getHotelsByCity(city) {
  if (city === null || city === undefined || city === '') return HOTELS;
  const cityKey = lookupKey(city);
  if (!cityKey) return [];
  return INDEX_BY_CITY.get(cityKey) || [];
}

export function getHotelsByCountry(country) {
  if (country === null || country === undefined || country === '') return HOTELS;
  const countryKey = lookupKey(country);
  if (!countryKey) return [];
  return INDEX_BY_COUNTRY.get(countryKey) || [];
}

export function getHotelsByContinent(continentId) {
  const continentKey = lookupKey(continentId);
  if (!continentKey) return [];
  return INDEX_BY_CONTINENT.get(continentKey) || [];
}

export function getHotelsByCities(cities) {
  if (!Array.isArray(cities) || cities.length === 0) return HOTELS;
  const results = [];
  for (const city of cities) {
    const cityKey = lookupKey(city);
    if (!cityKey) continue;
    const cityHotels = INDEX_BY_CITY.get(cityKey);
    if (cityHotels) results.push(...cityHotels);
  }
  return results;
}

export function findHotel(hotelKey) {
  return INDEX_BY_KEY.get(hotelKey) || null;
}

/**
 * Fuzzy search with field-weighted ranking.
 * Scoring: name match (100pts) > city match (50pts) > country match (25pts)
 * Supports typo tolerance via Levenshtein distance for short queries.
 */
export function searchHotels(query) {
  if (!query) return [];
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const scored = [];

  for (const entry of SEARCH_ENTRIES) {
    const [name, city, country] = entry.searchStr.split('\t');
    let score = 0;

    // Exact substring matches (weighted by field)
    if (name.includes(q)) score += 100 + (name.startsWith(q) ? 50 : 0);
    if (city.includes(q)) score += 50 + (city.startsWith(q) ? 25 : 0);
    if (country.includes(q)) score += 25 + (country.startsWith(q) ? 10 : 0);

    // Fuzzy match for short queries (typo tolerance)
    if (score === 0 && q.length >= 3 && q.length <= 15) {
      const threshold = Math.ceil(q.length / 4); // Allow 1 typo per 4 chars
      const nameWords = name.split(/\s+/);
      const cityWords = city.split(/\s+/);

      for (const word of nameWords) {
        if (levenshtein(q, word.slice(0, q.length + 1)) <= threshold) {
          score += 40; // Fuzzy name match
          break;
        }
      }
      if (score === 0) {
        for (const word of cityWords) {
          if (levenshtein(q, word.slice(0, q.length + 1)) <= threshold) {
            score += 20; // Fuzzy city match
            break;
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ hotel: entry.hotel, score });
    }
  }

  // Sort by score descending, then alphabetically by name
  return scored
    .sort((a, b) => b.score - a.score || a.hotel.name.localeCompare(b.hotel.name))
    .slice(0, 10)
    .map((s) => s.hotel);
}

/** Simple Levenshtein distance — no external dependency, fast for short strings */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// ── Dynamic catalog expansion (for discovered hotels) ──

/**
 * Add a discovered hotel to the runtime catalog. Updates all indexes.
 * Returns true if added, false when required fields are invalid or the hotelKey already exists.
 * Note: this only lasts for the current server process. Persist to KV for durability.
 *
 * @param {{ hotelKey: string, name: string, city: string, country: string, stars?: number, lat?: number, lon?: number, source?: string, sourceUrl?: string, externalIds?: object, provenance?: object }} hotel
 * @returns {boolean}
 */
export function addDiscoveredHotel(hotel) {
  const normalized = normalizeDiscoveredHotel(hotel);
  if (!normalized) return false;
  if (INDEX_BY_KEY.has(normalized.hotelKey)) return false; // already in catalog

  const entry = {
    ...normalized,
    image: img(normalized.city),
    discovered: true, // mark as dynamically added
  };

  HOTELS.push(entry);
  INDEX_BY_KEY.set(entry.hotelKey, entry);

  // Update city index
  const cityKey = entry.city.toLowerCase();
  if (!INDEX_BY_CITY.has(cityKey)) {
    INDEX_BY_CITY.set(cityKey, []);
    // Add to sorted cities list
    SORTED_CITIES.push(entry.city);
    SORTED_CITIES.sort((a, b) => a.localeCompare(b));
  }
  INDEX_BY_CITY.get(cityKey).push(entry);

  // Update country index
  const countryKey = entry.country.toLowerCase();
  if (!INDEX_BY_COUNTRY.has(countryKey)) {
    INDEX_BY_COUNTRY.set(countryKey, []);
    SORTED_COUNTRIES.push(entry.country);
    SORTED_COUNTRIES.sort((a, b) => a.localeCompare(b));
  }
  INDEX_BY_COUNTRY.get(countryKey).push(entry);

  // Update search entries
  SEARCH_ENTRIES.push({
    hotel: entry,
    searchStr: `${entry.name}\t${entry.city}\t${entry.country}`.toLowerCase(),
  });

  // Update continent index if country is mapped
  for (const [continentId, countries] of Object.entries(CONTINENT_COUNTRIES)) {
    if (countries.includes(countryKey)) {
      if (!INDEX_BY_CONTINENT.has(continentId)) INDEX_BY_CONTINENT.set(continentId, []);
      INDEX_BY_CONTINENT.get(continentId).push(entry);
      break;
    }
  }

  return true;
}

/**
 * Load discovered hotels from KV and merge into runtime catalog.
 * Returns the full catalog (static + discovered). Safe to call multiple times.
 * Uses kv dynamically to avoid circular imports.
 */
let _kvLoaded = false;
export async function getFullCatalog() {
  if (!_kvLoaded) {
    try {
      const { kv } = await import('@/lib/kv');
      const discovered = await kv.get('catalog:discovered');
      if (Array.isArray(discovered)) {
        let added = 0;
        for (const hotel of discovered) {
          if (addDiscoveredHotel(hotel)) added++;
        }
        if (added > 0) {
          console.info(`[catalog] Loaded ${added} discovered hotels from KV (total: ${HOTELS.length})`);
        }
      }
    } catch {
      // KV unavailable — use static catalog only
    }
    _kvLoaded = true;
  }
  return HOTELS;
}

/**
 * Persist a discovered hotel to both runtime catalog and KV.
 * Call this instead of addDiscoveredHotel() when you want durability.
 */
export async function addAndPersistHotel(hotel) {
  const normalized = normalizeDiscoveredHotel(hotel);
  if (!normalized) return false;

  const added = addDiscoveredHotel(normalized);
  if (added) {
    try {
      const { kv } = await import('@/lib/kv');
      const existingRaw = await kv.get('catalog:discovered');
      const existing = Array.isArray(existingRaw) ? existingRaw : [];
      existing.push(normalized);
      // 30-day TTL — re-discovery will refresh
      await kv.setWithTTL('catalog:discovered', existing, 30 * 86400);
    } catch {
      // KV write failed — hotel is still in runtime catalog
    }
  }
  return added;
}

/**
 * Get counts for catalog stats.
 */
export function getCatalogStats() {
  const discovered = HOTELS.filter((h) => h.discovered).length;
  return {
    totalHotels: HOTELS.length,
    discoveredHotels: discovered,
    catalogHotels: HOTELS.length - discovered,
    cities: INDEX_BY_CITY.size,
    countries: INDEX_BY_COUNTRY.size,
    continents: INDEX_BY_CONTINENT.size,
  };
}
