// Curated hotel catalog with TripAdvisor hotel keys (format: g{locationId}-d{hotelId})
// Used with Xotelo API for real-time price comparison across OTAs.

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
  'Perth':        'https://images.unsplash.com/photo-1573935448851-8d3e3083e06c?w=800&q=80',
  'Porto':        'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
  'Riyadh':       'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=800&q=80',
  'Salvador':     'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80',
  'Seoul':        'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=80',
  'Toronto':      'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&q=80',
  'Venice':       'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80',
  'Zagreb':       'https://images.unsplash.com/photo-1557828030-5eb1e5e8d16c?w=800&q=80',
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
  'middle-east': ['israel', 'uae', 'turkey', 'egypt', 'saudi arabia'],
  'asia': ['thailand', 'japan', 'singapore', 'indonesia', 'south korea', 'india', 'malaysia', 'sri lanka'],
  'europe': ['france', 'uk', 'united kingdom', 'italy', 'spain', 'netherlands', 'czech republic', 'austria', 'germany', 'greece', 'hungary', 'croatia', 'portugal', 'finland'],
  'americas': ['usa', 'brazil', 'canada'],
  'africa': ['kenya'],
  'oceania': ['australia'],
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
  if (!city) return HOTELS;
  return INDEX_BY_CITY.get(city.trim().toLowerCase()) || [];
}

export function getHotelsByCountry(country) {
  if (!country) return HOTELS;
  return INDEX_BY_COUNTRY.get(country.trim().toLowerCase()) || [];
}

export function getHotelsByContinent(continentId) {
  return INDEX_BY_CONTINENT.get(continentId) || [];
}

export function getHotelsByCities(cities) {
  if (!cities || cities.length === 0) return HOTELS;
  const results = [];
  for (const city of cities) {
    const cityHotels = INDEX_BY_CITY.get(city.trim().toLowerCase());
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
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

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
 * Returns true if added, false if the hotelKey already exists.
 * Note: this only lasts for the current server process. Persist to KV for durability.
 *
 * @param {{ hotelKey: string, name: string, city: string, country: string, stars?: number }} hotel
 * @returns {boolean}
 */
export function addDiscoveredHotel(hotel) {
  if (!hotel || !hotel.hotelKey || !hotel.name || !hotel.city || !hotel.country) return false;
  if (INDEX_BY_KEY.has(hotel.hotelKey)) return false; // already in catalog

  const entry = {
    hotelKey: hotel.hotelKey,
    name: hotel.name,
    city: hotel.city,
    country: hotel.country,
    stars: hotel.stars || 0,
    image: img(hotel.city),
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
          console.log(`[catalog] Loaded ${added} discovered hotels from KV (total: ${HOTELS.length})`);
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
  const added = addDiscoveredHotel(hotel);
  if (added) {
    try {
      const { kv } = await import('@/lib/kv');
      const existing = (await kv.get('catalog:discovered')) || [];
      existing.push({
        hotelKey: hotel.hotelKey,
        name: hotel.name,
        city: hotel.city,
        country: hotel.country,
        stars: hotel.stars || 0,
      });
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
