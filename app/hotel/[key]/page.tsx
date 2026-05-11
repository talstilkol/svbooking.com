'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFavorites, useRecentlyViewed } from '@/lib/useLocalStorage';
import { useCurrency } from '@/components/CurrencySelector';
import PriceTrend from '@/components/PriceTrend';
import RatingBadge from '@/components/RatingBadge';
import ProviderLogos from '@/components/ProviderLogos';
import PriceAlert from '@/components/PriceAlert';
import CheaperDates from '@/components/CheaperDates';
import SimilarHotels from '@/components/SimilarHotels';
import BestTimeToBook from '@/components/BestTimeToBook';
import PhotoGallery from '@/components/PhotoGallery';
import HotelAmenities from '@/components/HotelAmenities';
import PriceGuarantee from '@/components/PriceGuarantee';
import DateSummary from '@/components/DateSummary';
import ProviderInfo from '@/components/ProviderInfo';
import Breadcrumb from '@/components/Breadcrumb';
import StarRating from '@/components/StarRating';
import StickyCompareBar from '@/components/StickyCompareBar';
import CountdownDeal from '@/components/CountdownDeal';
import ReviewHighlights from '@/components/ReviewHighlights';
import LastUpdated from '@/components/LastUpdated';
import ComparisonMeta from '@/components/ComparisonMeta';
import LoadingOverlay from '@/components/LoadingOverlay';
import BookingTimeline from '@/components/BookingTimeline';
import TripCostCalculator from '@/components/TripCostCalculator';
import PriceCalendar from '@/components/PriceCalendar';
import NearbyAttractions from '@/components/NearbyAttractions';
import TravelChecklist from '@/components/TravelChecklist';
import WeatherWidget from '@/components/WeatherWidget';
import ShareModal from '@/components/ShareModal';
import PrintButton from '@/components/PrintButton';
import DeepLink from '@/components/DeepLink';
import RoomTypeSelector from '@/components/RoomTypeSelector';
import HotelPolicies from '@/components/HotelPolicies';
import PriceBreakdown from '@/components/PriceBreakdown';
import LoyaltyBanner from '@/components/LoyaltyBanner';
import { HotelOfferJsonLd } from '@/components/SchemaOrg';
import UserReviewForm from '@/components/UserReviewForm';
import ViewTracker from '@/components/ViewTracker';
import HotelBadges from '@/components/HotelBadges';
import PriceComparisonChart from '@/components/PriceComparisonChart';
import FloatingCTA from '@/components/FloatingCTA';
import FlightEstimate from '@/components/FlightEstimate';
import { CompareCardSkeleton } from '@/components/Skeleton';

interface Hotel {
  hotelKey: string;
  name: string;
  city: string;
  country: string;
  image: string;
}

interface Rate {
  provider: string;
  code: string;
  rate: number;
  tax: number;
  total: number;
  currency: string;
}

interface Comparison {
  hotel: Hotel;
  checkIn: string;
  checkOut: string;
  currency: string;
  rates: Rate[];
  cheapest: Rate | null;
  savingsPct: number;
  savingsAmount: number;
  providerCount: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  'Booking.com': 'bg-blue-100 text-blue-800',
  'Expedia': 'bg-yellow-100 text-yellow-800',
  'Hotels.com': 'bg-red-100 text-red-800',
  'Agoda.com': 'bg-purple-100 text-purple-800',
  'Vio.com': 'bg-green-100 text-green-800',
  'Trip.com': 'bg-sky-100 text-sky-800',
};

function getBookingUrl(provider: string, hotelName: string, city: string, checkIn: string, checkOut: string) {
  const query = encodeURIComponent(`${hotelName} ${city}`);
  const urls: Record<string, string> = {
    'Booking.com': `https://www.booking.com/searchresults.html?ss=${query}&checkin=${checkIn}&checkout=${checkOut}`,
    'Expedia': `https://www.expedia.com/Hotel-Search?destination=${query}&startDate=${checkIn}&endDate=${checkOut}`,
    'Hotels.com': `https://www.hotels.com/search.do?q-destination=${query}&q-check-in=${checkIn}&q-check-out=${checkOut}`,
    'Agoda.com': `https://www.agoda.com/search?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}`,
    'Vio.com': `https://www.vio.com/hotels?q=${query}&checkIn=${checkIn}&checkOut=${checkOut}`,
    'Trip.com': `https://www.trip.com/hotels/?city=${encodeURIComponent(city)}&checkin=${checkIn}&checkout=${checkOut}`,
  };
  return urls[provider] || `https://www.google.com/travel/hotels?q=${query}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function HotelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hotelKey = Array.isArray(params.key) ? params.key[0] : (params.key as string);

  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const { addRecentlyViewed } = useRecentlyViewed();
  const { currency } = useCurrency();

  // Fetch hotel info from catalog immediately (for hero + recently viewed)
  useEffect(() => {
    if (!hotelKey) return;
    fetch(`/api/compare?hotelKey=${hotelKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.hotel) {
          setHotel(d.hotel);
          addRecentlyViewed({
            hotelKey: d.hotel.hotelKey,
            name: d.hotel.name,
            city: d.hotel.city,
            country: d.hotel.country,
            image: d.hotel.image,
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelKey]);

  const handleCompare = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!checkIn || !checkOut) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await fetch(
        `/api/compare?hotelKey=${hotelKey}&checkIn=${checkIn}&checkOut=${checkOut}&currency=${currency}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load prices');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [hotelKey, checkIn, checkOut, currency]);

  // Update hotel from comparison data too
  const displayHotel = data?.hotel || hotel;
  const nights = data
    ? Math.round((new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000)
    : 0;

  const fav = hydrated && displayHotel && isFavorite(displayHotel.hotelKey);

  const handleShare = async () => {
    if (!displayHotel) return;
    const url = `${window.location.origin}/hotel/${hotelKey}`;
    const text = `Check out ${displayHotel.name} in ${displayHotel.city} — compare prices from 8+ providers`;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayHotel.name, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Structured data for SEO */}
      {data?.cheapest && displayHotel && (
        <HotelOfferJsonLd
          hotelName={displayHotel.name}
          city={displayHotel.city}
          country={displayHotel.country}
          image={displayHotel.image}
          pricePerNight={Math.round(data.cheapest.total / nights)}
          currency={data.currency}
          provider={data.cheapest.provider}
          checkIn={data.checkIn}
          checkOut={data.checkOut}
          ratingValue={7 + ((displayHotel.hotelKey.charCodeAt(5) || 0) % 25) / 10}
          ratingCount={50 + ((displayHotel.hotelKey.charCodeAt(3) || 0) * 7) % 450}
        />
      )}

      {/* Floating mobile CTA */}
      {displayHotel && data?.cheapest && (
        <FloatingCTA
          hotelName={displayHotel.name}
          cheapestPrice={data.cheapest.total}
          currency={data.currency}
          provider={data.cheapest.provider}
        />
      )}

      {/* Sticky compare bar */}
      {displayHotel && data?.cheapest && (
        <StickyCompareBar
          hotelName={displayHotel.name}
          cheapestProvider={data.cheapest.provider}
          cheapestPrice={data.cheapest.total}
          currency={data.currency}
          nights={nights}
          visible={searched}
        />
      )}

      {/* Hero */}
      <div className="relative h-72 md:h-96 bg-zinc-900 overflow-hidden">
        {displayHotel ? (
          <Image
            src={displayHotel.image}
            alt={displayHotel.name}
            fill
            className="object-cover opacity-80"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-blue-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-2 bg-white/20 backdrop-blur text-white px-3 py-2 rounded-lg hover:bg-white/30 transition text-sm font-medium"
        >
          ← Back
        </button>

        {displayHotel && (
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">{displayHotel.name}</h1>
                <p className="text-white/80 mt-1 text-lg">
                  📍 {displayHotel.city}, {displayHotel.country}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <RatingBadge hotelKey={displayHotel.hotelKey} size="sm" className="[&>span:first-child]:!bg-white/20 [&>span:last-child]:!text-white/70" />
                  <StarRating rating={4 + ((displayHotel.hotelKey.charCodeAt(5) % 10) / 10)} size="sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleShare}
                  aria-label="Share this hotel"
                  className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:scale-110 transition"
                >
                  <span className="text-xl">🔗</span>
                </button>
                {hydrated && (
                  <button
                    onClick={() => toggleFavorite(displayHotel)}
                    aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:scale-110 transition"
                  >
                    <span className={`text-2xl ${fav ? 'text-red-400' : 'text-white/70'}`}>
                      {fav ? '♥' : '♡'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Photo Gallery */}
        {displayHotel && (
          <PhotoGallery
            mainImage={displayHotel.image}
            hotelName={displayHotel.name}
            city={displayHotel.city}
          />
        )}

        {/* Breadcrumb */}
        {displayHotel && (
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Search', href: '/search' },
              { label: displayHotel.city, href: `/search?city=${encodeURIComponent(displayHotel.city)}` },
              { label: displayHotel.name },
            ]}
          />
        )}

        {/* Hotel badges */}
        <HotelBadges hotelKey={hotelKey} className="mb-3" />

        {/* View tracker */}
        <ViewTracker hotelKey={hotelKey} className="mb-4" />

        {/* Date picker */}
        <form
          onSubmit={handleCompare}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {searched ? 'Change dates' : 'Check availability & prices'}
          </h2>
          <ProviderLogos className="mb-4" />
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="hotel-checkin" className="block text-sm font-medium text-slate-600 mb-1">
                Check-in
              </label>
              <input
                id="hotel-checkin"
                type="date"
                value={checkIn}
                min={today()}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (e.target.value >= checkOut) {
                    const d = new Date(e.target.value);
                    d.setDate(d.getDate() + 1);
                    setCheckOut(d.toISOString().split('T')[0]);
                  }
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="hotel-checkout" className="block text-sm font-medium text-slate-600 mb-1">
                Check-out
              </label>
              <input
                id="hotel-checkout"
                type="date"
                value={checkOut}
                min={checkIn || today()}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !checkIn || !checkOut}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
            >
              {loading ? 'Loading…' : 'Compare prices'}
            </button>
          </div>
        </form>

        {/* Amenities */}
        <HotelAmenities hotelKey={hotelKey} className="mb-6" />

        {/* Loyalty banner */}
        <LoyaltyBanner className="mb-6" />

        {/* Price Guarantee */}
        <PriceGuarantee className="mb-6" />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading overlay with provider animation */}
        <LoadingOverlay active={loading} className="mb-6" />

        {/* Date summary + countdown */}
        {data && (
          <div className="space-y-3 mb-4">
            <DateSummary checkIn={data.checkIn} checkOut={data.checkOut} />
            <CountdownDeal checkIn={data.checkIn} />
          </div>
        )}

        {/* Comparison meta + last updated */}
        {!loading && data && data.rates.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <ComparisonMeta
              providerCount={data.providerCount}
              checkIn={data.checkIn}
              checkOut={data.checkOut}
              currency={data.currency}
            />
            <LastUpdated />
          </div>
        )}

        {/* Results */}
        {!loading && data && data.rates.length > 0 && (
          <div id="price-results" className="space-y-6">
            {/* Summary banner */}
            {data.savingsPct > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-semibold text-green-800">
                    Save up to {data.savingsPct}% ({data.currency} {data.savingsAmount.toFixed(0)})
                  </p>
                  <p className="text-green-700 text-sm">
                    by choosing the cheapest provider for {nights} night{nights !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Visual price chart */}
            <PriceComparisonChart rates={data.rates} nights={nights} className="mb-4" />

            {/* Price cards */}
            <div className="space-y-3">
              {data.rates.map((rate, idx) => {
                const isCheapest = rate.provider === data.cheapest?.provider;
                const bookingUrl = getBookingUrl(rate.provider, data.hotel.name, data.hotel.city, data.checkIn, data.checkOut);
                const colorClass = PROVIDER_COLORS[rate.provider] || 'bg-slate-100 text-slate-700';
                return (
                  <div
                    key={rate.provider}
                    className={`bg-white rounded-xl border p-5 flex items-center gap-4 transition ${
                      isCheapest ? 'border-green-300 shadow-md' : 'border-slate-200'
                    }`}
                  >
                    {isCheapest && (
                      <span className="absolute -mt-10 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-300">
                        Best price
                      </span>
                    )}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-500 w-5 shrink-0">{idx + 1}</span>
                      <span className="flex items-center gap-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 ${colorClass}`}>
                          {rate.provider}
                        </span>
                        <ProviderInfo provider={rate.provider} />
                      </span>
                      {isCheapest && (
                        <span className="hidden sm:inline text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          Best price
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-slate-900">
                        {rate.currency} {rate.total.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {rate.currency} {(rate.total / nights).toFixed(0)}/night · incl. taxes
                      </div>
                    </div>
                    <a
                      href={bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition shrink-0"
                    >
                      Book →
                    </a>
                  </div>
                );
              })}
            </div>

            {/* CTA links */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={`/compare?hotelKey=${hotelKey}&checkIn=${data.checkIn}&checkOut=${data.checkOut}`}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition"
              >
                Full comparison view →
              </Link>
              <Link
                href={`/trips?hotelKey=${hotelKey}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
              >
                Save to trip planner →
              </Link>
              <ShareModal
                url={typeof window !== 'undefined' ? `${window.location.origin}/hotel/${hotelKey}` : ''}
                title={data.hotel.name}
                description={`Compare prices for ${data.hotel.name} in ${data.hotel.city} from 8+ providers`}
              />
              <PrintButton />
              <DeepLink
                hotelKey={hotelKey}
                hotelName={data.hotel.name}
                checkIn={data.checkIn}
                checkOut={data.checkOut}
              />
            </div>

            {/* Price breakdown */}
            {data.cheapest && (
              <PriceBreakdown
                pricePerNight={data.cheapest.total / nights}
                nights={nights}
                provider={data.cheapest.provider}
                currency={data.currency === 'USD' ? '$' : data.currency + ' '}
                className="mt-4"
              />
            )}

            {/* Room type selector */}
            {data.cheapest && (
              <RoomTypeSelector
                basePrice={Math.round(data.cheapest.total / nights)}
                currency={data.currency === 'USD' ? '$' : data.currency + ' '}
                className="mt-6"
              />
            )}

            {/* Price alert */}
            {data.cheapest && (
              <div className="mt-4">
                <PriceAlert
                  hotelKey={hotelKey}
                  hotelName={data.hotel.name}
                  city={data.hotel.city}
                  currentPrice={data.cheapest.total / nights}
                  currency={data.currency}
                />
              </div>
            )}

            {/* Cheaper dates */}
            <div className="mt-4">
              <CheaperDates
                hotelKey={hotelKey}
                checkIn={data.checkIn}
                checkOut={data.checkOut}
              />
            </div>

            {/* Trip cost calculator */}
            {data.cheapest && (
              <TripCostCalculator
                hotelPricePerNight={data.cheapest.total / nights}
                nights={nights}
                currency={data.currency}
                className="mt-4"
              />
            )}

            {/* Booking timeline */}
            <BookingTimeline
              checkIn={data.checkIn}
              checkOut={data.checkOut}
              hasCompared={true}
              className="mt-4"
            />
          </div>
        )}

        {/* No results */}
        {!loading && searched && data?.rates.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg font-medium">No prices available for these dates</p>
            <p className="text-sm mt-2">Try different dates or check the full comparison page.</p>
          </div>
        )}

        {/* Initial prompt */}
        {!loading && !searched && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-5xl mb-4">📅</div>
            <p className="text-lg">Select dates above to compare live prices from 8+ providers</p>
          </div>
        )}

        {/* Price calendar heatmap */}
        <PriceCalendar hotelKey={hotelKey} className="mt-8" />

        {/* Best time to book */}
        {displayHotel && (
          <BestTimeToBook hotelKey={hotelKey} hotelName={displayHotel.name} />
        )}

        {/* 30-day price trend chart */}
        <div className="mt-8">
          <PriceTrend hotelKey={hotelKey} nights={nights || 1} currency={currency} />
        </div>

        {/* Nearby attractions + Weather + Flights */}
        {displayHotel && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <NearbyAttractions city={displayHotel.city} />
            <WeatherWidget
              city={displayHotel.city}
              checkIn={data?.checkIn}
            />
            <FlightEstimate city={displayHotel.city} />
          </div>
        )}

        {/* Guest reviews */}
        {displayHotel && (
          <ReviewHighlights
            hotelKey={hotelKey}
            hotelName={displayHotel.name}
            className="mt-8"
          />
        )}

        {/* Write a review */}
        {displayHotel && (
          <UserReviewForm
            hotelKey={hotelKey}
            hotelName={displayHotel.name}
            className="mt-8"
          />
        )}

        {/* Hotel policies */}
        <HotelPolicies hotelKey={hotelKey} className="mt-8" />

        {/* Travel checklist */}
        <TravelChecklist hotelKey={hotelKey} className="mt-8" />

        {/* Similar hotels */}
        {displayHotel && (
          <SimilarHotels
            currentHotelKey={hotelKey}
            city={displayHotel.city}
            country={displayHotel.country}
          />
        )}
      </div>
    </div>
  );
}
