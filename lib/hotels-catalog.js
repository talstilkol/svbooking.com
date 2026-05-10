// Curated hotel catalog with TripAdvisor hotel keys (format: g{locationId}-d{hotelId})
// Used with Xotelo API for real-time price comparison across OTAs.
// Keys can be found from TripAdvisor URLs:
//   https://www.tripadvisor.com/Hotel_Review-g{LOCATION}-d{HOTEL}-Reviews-...

export const HOTELS = [
  // Tel Aviv
  {
    hotelKey: 'g293984-d301497',
    name: 'Hilton Tel Aviv',
    city: 'Tel Aviv',
    country: 'Israel',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
  },
  {
    hotelKey: 'g293984-d301984',
    name: 'Dan Tel Aviv',
    city: 'Tel Aviv',
    country: 'Israel',
    image: 'https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800',
  },
  // Jerusalem
  {
    hotelKey: 'g293983-d320692',
    name: 'King David Hotel',
    city: 'Jerusalem',
    country: 'Israel',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
  },
  // Phuket
  {
    hotelKey: 'g297930-d305178',
    name: 'Patong Beach Hotel',
    city: 'Phuket',
    country: 'Thailand',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  },
  // Paris
  {
    hotelKey: 'g187147-d188728',
    name: 'Le Meurice',
    city: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  },
  {
    hotelKey: 'g187147-d197539',
    name: 'Hotel Plaza Athenee',
    city: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800',
  },
  // London
  {
    hotelKey: 'g186338-d193089',
    name: 'The Savoy',
    city: 'London',
    country: 'UK',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
  },
  {
    hotelKey: 'g186338-d187591',
    name: 'The Ritz London',
    city: 'London',
    country: 'UK',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
  },
  // New York
  {
    hotelKey: 'g60763-d99762',
    name: 'The Plaza',
    city: 'New York',
    country: 'USA',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  },
  {
    hotelKey: 'g60763-d224075',
    name: 'The Standard High Line',
    city: 'New York',
    country: 'USA',
    image: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=800',
  },
  // Tokyo
  {
    hotelKey: 'g1066456-d320047',
    name: 'Park Hyatt Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
  },
  // Rome
  {
    hotelKey: 'g187791-d191117',
    name: 'Hotel de Russie',
    city: 'Rome',
    country: 'Italy',
    image: 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800',
  },
  // Barcelona
  {
    hotelKey: 'g187497-d228735',
    name: 'Hotel Arts Barcelona',
    city: 'Barcelona',
    country: 'Spain',
    image: 'https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=800',
  },
  // Dubai
  {
    hotelKey: 'g295424-d302013',
    name: 'Burj Al Arab Jumeirah',
    city: 'Dubai',
    country: 'UAE',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
  },
  {
    hotelKey: 'g295424-d662737',
    name: 'Atlantis The Palm',
    city: 'Dubai',
    country: 'UAE',
    image: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800',
  },
];

export function listCities() {
  return Array.from(new Set(HOTELS.map((h) => h.city))).sort();
}

export function getHotelsByCity(city) {
  if (!city) return HOTELS;
  const norm = city.trim().toLowerCase();
  return HOTELS.filter((h) => h.city.toLowerCase() === norm);
}

export function findHotel(hotelKey) {
  return HOTELS.find((h) => h.hotelKey === hotelKey) || null;
}
