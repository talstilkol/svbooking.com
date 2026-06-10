import { listCities, getHotelsByCity } from '@/lib/hotels-catalog';
import PopularCitiesClient, { type PopularCityItem } from '@/components/PopularCitiesClient';

const FEATURED_CITIES = ['Paris', 'London', 'Tokyo', 'Dubai', 'New York', 'Bangkok', 'Barcelona', 'Rome'];

export default function PopularCities() {
  const cities = FEATURED_CITIES.filter((c) => listCities().includes(c)).slice(0, 8);
  const items: PopularCityItem[] = cities.map((city) => {
    const hotels = getHotelsByCity(city);
    return {
      city,
      count: hotels.length,
      image: hotels[0]?.image,
    };
  });

  return <PopularCitiesClient cities={items} />;
}
