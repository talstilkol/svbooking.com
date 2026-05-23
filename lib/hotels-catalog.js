// Curated hotel catalog with TripAdvisor hotel keys (format: g{locationId}-d{hotelId})
// Used with Xotelo API for provider-returned price comparison across OTAs.

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
  'Hong Kong':    'https://images.unsplash.com/photo-1536599018102-9f803c029bf1?w=800&q=80',
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
  { hotelKey: 'g1722390-d302064', name: 'One&Only Cape Town',            city: 'Cape Town',  country: 'South Africa', image: img('Cape Town') },
  { hotelKey: 'g1722390-d304741', name: 'Belmond Mount Nelson Cape Town',city: 'Cape Town',  country: 'South Africa', image: img('Cape Town') },
  { hotelKey: 'g1722390-d479218', name: 'The Silo Hotel Cape Town',      city: 'Cape Town',  country: 'South Africa', image: img('Cape Town') },

  // ── HONG KONG ──────────────────────────────────────────────
  { hotelKey: 'g294217-d302318', name: 'The Peninsula Hong Kong',        city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
  { hotelKey: 'g294217-d306752', name: 'Mandarin Oriental Hong Kong',    city: 'Hong Kong',  country: 'China',       image: img('Hong Kong') },
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
  { hotelKey: 'g189180-d232826', name: 'The Yeatman Porto',              city: 'Porto',      country: 'Portugal',    image: img('Porto') },
  { hotelKey: 'g189180-d233113', name: 'InterContinental Porto',         city: 'Porto',      country: 'Portugal',    image: img('Porto') },

  // ── SOUTH KOREA (expanded) ─────────────────────────────────
  { hotelKey: 'g294197-d302049', name: 'Four Seasons Seoul',             city: 'Seoul',      country: 'South Korea', image: img('Seoul') },
  { hotelKey: 'g294197-d304090', name: 'The Shilla Seoul',               city: 'Seoul',      country: 'South Korea', image: img('Seoul') },

  // ── CANADA (expanded) ──────────────────────────────────────
  { hotelKey: 'g155019-d155591', name: 'Fairmont Royal York Toronto',    city: 'Toronto',    country: 'Canada',      image: img('Toronto') },
  { hotelKey: 'g155019-d182584', name: 'The Ritz-Carlton Toronto',       city: 'Toronto',    country: 'Canada',      image: img('Toronto') },
  { hotelKey: 'g155019-d181814', name: 'Four Seasons Hotel Toronto',     city: 'Toronto',    country: 'Canada',      image: img('Toronto') },

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
  'middle-east': ['israel', 'uae', 'turkey', 'egypt', 'saudi arabia', 'qatar', 'jordan', 'oman'],
  'asia': ['thailand', 'japan', 'singapore', 'indonesia', 'south korea', 'india', 'malaysia', 'sri lanka', 'china', 'vietnam', 'maldives'],
  'europe': ['france', 'united kingdom', 'italy', 'spain', 'netherlands', 'czech republic', 'austria', 'germany', 'greece', 'hungary', 'croatia', 'portugal', 'finland', 'ireland', 'switzerland', 'denmark', 'sweden', 'poland'],
  'americas': ['usa', 'brazil', 'canada', 'mexico', 'argentina'],
  'africa': ['kenya', 'morocco', 'south africa'],
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
 * @param {{ hotelKey: string, name: string, city: string, country: string, stars?: number, lat?: number, lon?: number, source?: string, sourceUrl?: string, externalIds?: object, provenance?: object }} hotel
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
    lat: hotel.lat !== null && hotel.lat !== undefined && Number.isFinite(Number(hotel.lat)) ? Number(hotel.lat) : null,
    lon: hotel.lon !== null && hotel.lon !== undefined && Number.isFinite(Number(hotel.lon)) ? Number(hotel.lon) : null,
    source: hotel.source || null,
    sourceUrl: hotel.sourceUrl || null,
    externalIds: hotel.externalIds || {},
    provenance: hotel.provenance || null,
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
        lat: hotel.lat !== null && hotel.lat !== undefined && Number.isFinite(Number(hotel.lat)) ? Number(hotel.lat) : null,
        lon: hotel.lon !== null && hotel.lon !== undefined && Number.isFinite(Number(hotel.lon)) ? Number(hotel.lon) : null,
        source: hotel.source || null,
        sourceUrl: hotel.sourceUrl || null,
        externalIds: hotel.externalIds || {},
        provenance: hotel.provenance || null,
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
