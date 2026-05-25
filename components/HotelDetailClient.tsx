'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useFavorites, useRecentlyViewed } from '@/lib/useLocalStorage';
import { useCurrency } from '@/components/CurrencySelector';
import { useToast } from '@/components/Toast';
import RatingBadge from '@/components/RatingBadge';
import ProviderLogos from '@/components/ProviderLogos';
import DateSummary from '@/components/DateSummary';
import ProviderInfo from '@/components/ProviderInfo';
import Breadcrumb from '@/components/Breadcrumb';
import CountdownDeal from '@/components/CountdownDeal';
import ComparisonMeta from '@/components/ComparisonMeta';
import LoadingOverlay from '@/components/LoadingOverlay';
import ViewTracker from '@/components/ViewTracker';
import HotelBadges from '@/components/HotelBadges';
import PriceComparisonChart from '@/components/PriceComparisonChart';
import { HotelOfferJsonLd } from '@/components/SchemaOrg';
import type { CatalogHotel, ProviderRate } from '@/lib/types';

// Dynamic imports for below-the-fold components (reduces initial JS bundle)
const PriceTrend = dynamic(() => import('@/components/PriceTrend'), { ssr: false });
const PriceAlert = dynamic(() => import('@/components/PriceAlert'), { ssr: false });
const CheaperDates = dynamic(() => import('@/components/CheaperDates'), { ssr: false });
const SimilarHotels = dynamic(() => import('@/components/SimilarHotels'), { ssr: false });
const BestTimeToBook = dynamic(() => import('@/components/BestTimeToBook'), { ssr: false });
const PhotoGallery = dynamic(() => import('@/components/PhotoGallery'), { ssr: false });
const HotelAmenities = dynamic(() => import('@/components/HotelAmenities'), { ssr: false });
const PriceComparisonNotice = dynamic(() => import('@/components/PriceComparisonNotice'), { ssr: false });
const StickyCompareBar = dynamic(() => import('@/components/StickyCompareBar'), { ssr: false });
const FloatingCTA = dynamic(() => import('@/components/FloatingCTA'), { ssr: false });
const ReviewHighlights = dynamic(() => import('@/components/ReviewHighlights'), { ssr: false });
const BookingTimeline = dynamic(() => import('@/components/BookingTimeline'), { ssr: false });
const TripCostCalculator = dynamic(() => import('@/components/TripCostCalculator'), { ssr: false });
const PriceCalendar = dynamic(() => import('@/components/PriceCalendar'), { ssr: false });
const NearbyAttractions = dynamic(() => import('@/components/NearbyAttractions'), { ssr: false });
const TravelChecklist = dynamic(() => import('@/components/TravelChecklist'), { ssr: false });
const WeatherWidget = dynamic(() => import('@/components/WeatherWidget'), { ssr: false });
const ShareModal = dynamic(() => import('@/components/ShareModal'), { ssr: false });
const PrintButton = dynamic(() => import('@/components/PrintButton'), { ssr: false });
const DeepLink = dynamic(() => import('@/components/DeepLink'), { ssr: false });
const RoomTypeSelector = dynamic(() => import('@/components/RoomTypeSelector'), { ssr: false });
const HotelPolicies = dynamic(() => import('@/components/HotelPolicies'), { ssr: false });
const PriceBreakdown = dynamic(() => import('@/components/PriceBreakdown'), { ssr: false });
const LoyaltyBanner = dynamic(() => import('@/components/LoyaltyBanner'), { ssr: false });
const HolidayWarning = dynamic(() => import('@/components/HolidayWarning'), { ssr: false });
const CityDescription = dynamic(() => import('@/components/CityDescription'), { ssr: false });
const PriceInCurrencies = dynamic(() => import('@/components/PriceInCurrencies'), { ssr: false });
const HotelQuickFacts = dynamic(() => import('@/components/HotelQuickFacts'), { ssr: false });
const ProviderDataNotice = dynamic(() => import('@/components/ProviderDataNotice'), { ssr: false });
const FlightDataNotice = dynamic(() => import('@/components/FlightDataNotice'), { ssr: false });
const PriceHistory = dynamic(() => import('@/components/PriceHistory'), { ssr: false });

type Hotel = CatalogHotel;
type Rate = ProviderRate;

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
  freshness?: string;
  fromCache?: boolean;
  lastCheckedAt?: string | null;
  estimatedFromDates?: { checkIn: string; checkOut: string } | null;
}

const PROVIDER_COLORS: Record<string, string> = {
  'Booking.com': 'bg-blue-100 text-blue-800',
  'Expedia': 'bg-yellow-100 text-yellow-800',
  'Hotels.com': 'bg-red-100 text-red-800',
  'Agoda.com': 'bg-purple-100 text-purple-800',
  'Vio.com': 'bg-green-100 text-green-800',
  'Trip.com': 'bg-sky-100 text-sky-800',
};

function today() {
  return new Date().toISOString().split('T')[0];
}
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

interface HotelDetailClientProps {
  hotel: Hotel;
}

export default function HotelDetailClient({ hotel }: HotelDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelKey = hotel.hotelKey;
  const autoCompared = useRef(false);

  // Read dates from URL params (for shared/deep links) or use defaults
  const urlCheckIn = searchParams.get('checkIn');
  const urlCheckOut = searchParams.get('checkOut');
  const [checkIn, setCheckIn] = useState(urlCheckIn || today());
  const [checkOut, setCheckOut] = useState(urlCheckOut || tomorrow());
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const { isFavorite, toggleFavorite, hydrated } = useFavorites();
  const { addRecentlyViewed } = useRecentlyViewed();
  const { currency } = useCurrency();
  const { showToast } = useToast();

  // Track recently viewed on mount
  useEffect(() => {
    addRecentlyViewed({
      hotelKey: hotel.hotelKey,
      name: hotel.name,
      city: hotel.city,
      country: hotel.country,
      image: hotel.image,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.hotelKey]);

  // Prefetch prices for default dates on mount (warms cache silently).
  // Skip if URL params are present — auto-compare will fetch instead.
  useEffect(() => {
    if (urlCheckIn && urlCheckOut) return;
    const controller = new AbortController();
    const defaultCheckIn = today();
    const defaultCheckOut = tomorrow();
    fetch(
      `/api/compare?hotelKey=${hotel.hotelKey}&checkIn=${defaultCheckIn}&checkOut=${defaultCheckOut}&currency=USD`,
      { signal: controller.signal, priority: 'low' as RequestPriority }
    ).catch(() => {});
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.hotelKey]);

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
      if (!res.ok) throw new Error('Price comparison unavailable');
      setData(json);
    } catch {
      setError('Price comparison is unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [hotelKey, checkIn, checkOut, currency]);

  const handleRefresh = useCallback(async () => {
    if (!checkIn || !checkOut || refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelKey, checkIn, checkOut, currency }),
      });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { /* refresh failed silently — stale data remains */ }
    setRefreshing(false);
  }, [hotelKey, checkIn, checkOut, currency, refreshing]);

  // Auto-compare when URL has date params (from shared links / deep links)
  useEffect(() => {
    if (urlCheckIn && urlCheckOut && !autoCompared.current) {
      autoCompared.current = true;
      handleCompare();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCheckIn, urlCheckOut]);

  // Use comparison hotel if available (might have extra data), otherwise server-provided hotel
  const displayHotel = data?.hotel || hotel;
  const nights = data
    ? Math.max(Math.round((new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000), 1)
    : 1;

  const fav = hydrated && isFavorite(displayHotel.hotelKey);

  const handleShare = async () => {
    const url = `${window.location.origin}/hotel/${hotelKey}`;
    const text = `Check out ${displayHotel.name} in ${displayHotel.city} — compare prices from available providers`;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayHotel.name, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Structured data for SEO */}
      {data?.cheapest?.deepLink && (
        <HotelOfferJsonLd
          hotelName={displayHotel.name}
          city={displayHotel.city}
          country={displayHotel.country}
          image={displayHotel.image}
          pricePerNight={Math.round(data.cheapest.total / nights)}
          currency={data.currency}
          provider={data.cheapest.provider}
          url={data.cheapest.deepLink}
        />
      )}

      {/* Floating mobile CTA */}
      {data?.cheapest && (
        <FloatingCTA
          hotelName={displayHotel.name}
          cheapestPrice={data.cheapest.total}
          currency={data.currency}
          provider={data.cheapest.provider}
        />
      )}

      {/* Sticky compare bar */}
      {data?.cheapest && (
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
        <Image
          src={displayHotel.image}
          alt={displayHotel.name}
          fill
          className="object-cover opacity-80"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-2 bg-white/20 backdrop-blur text-white px-3 py-2 rounded-lg hover:bg-white/30 transition text-sm font-medium"
        >
          &larr; Back
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">{displayHotel.name}</h1>
              <p className="text-white/80 mt-1 text-lg">
                &#128205; {displayHotel.city}, {displayHotel.country}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <RatingBadge size="sm" className="[&>span:first-child]:!bg-white/20 [&>span:first-child]:!text-white [&>span:last-child]:!text-white/70" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShare}
                aria-label="Share this hotel"
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:scale-110 transition"
              >
                <span className="text-xl">&#128279;</span>
              </button>
              {hydrated && (
                <button
                  onClick={() => { toggleFavorite(displayHotel); showToast(fav ? `Removed ${displayHotel.name} from favorites` : `Added ${displayHotel.name} to favorites`, 'success'); }}
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
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Photo Gallery */}
        <PhotoGallery
          mainImage={displayHotel.image}
          hotelName={displayHotel.name}
          city={displayHotel.city}
        />

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Search', href: '/search' },
            { label: displayHotel.city, href: `/search?city=${encodeURIComponent(displayHotel.city)}` },
            { label: displayHotel.name },
          ]}
        />

        {/* Hotel badges */}
        <HotelBadges className="mb-3" />

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

        {/* Quick facts */}
        <HotelQuickFacts
          hotelKey={hotelKey}
          hotelName={displayHotel.name}
          city={displayHotel.city}
          className="mb-6"
        />

        {/* Loyalty banner */}
        <LoyaltyBanner className="mb-6" />

        {/* Price comparison notice */}
        <PriceComparisonNotice className="mb-6" />

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

        {/* Comparison meta + last updated + refresh */}
        {!loading && data && data.rates.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <ComparisonMeta
              providerCount={data.providerCount}
              checkIn={data.checkIn}
              checkOut={data.checkOut}
              currency={data.currency}
            />
            {data.freshness === 'estimated' && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                title={data.estimatedFromDates ? `Based on prices for ${data.estimatedFromDates.checkIn} to ${data.estimatedFromDates.checkOut}` : 'Estimated from nearby dates'}
              >
                <span>~</span>
                Estimated prices — updating live
              </span>
            )}
            {(data.freshness === 'stale' || data.freshness === 'estimated') && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                title="Click to fetch live prices from providers"
              >
                {refreshing ? (
                  <span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>↻</span>
                )}
                {refreshing ? 'Refreshing...' : 'Refresh prices'}
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && data && data.rates.length > 0 && (
          <div id="price-results" className="space-y-6">
            {/* Summary banner */}
            {data.savingsPct > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">&#128176;</span>
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
                const colorClass = PROVIDER_COLORS[rate.provider] || 'bg-slate-100 text-slate-700';
                const taxLabel = rate.taxesIncluded === true
                  ? 'taxes included'
                  : rate.taxesIncluded === false
                    ? 'taxes may be excluded'
                    : 'tax status unavailable';
                return (
                  <div
                    key={`${rate.provider}-${rate.code || idx}`}
                    className={`bg-white rounded-xl border p-5 flex items-center gap-4 transition ${
                      isCheapest ? 'border-green-300 shadow-md' : 'border-slate-200'
                    }`}
                  >
                    {isCheapest && (
                      <span className="absolute -mt-10 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-300">
                        Lowest returned price
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
                          Lowest returned price
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-slate-900">
                        {rate.currency} {rate.total.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {rate.currency} {(rate.total / nights).toFixed(0)}/night &middot; {taxLabel}
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!rate.deepLink) return;
                        // Open tab immediately for responsiveness, then redirect to affiliate URL
                        const tab = window.open('about:blank', '_blank');
                        if (tab) tab.opener = null;
                        try {
                          const res = await fetch('/api/click', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              hotelKey,
                              provider: rate.provider,
                              url: rate.deepLink,
                              price: rate.total,
                              currency: rate.currency,
                              taxesIncluded: rate.taxesIncluded,
                            }),
                          });
                          const clickData = await res.json();
                          if (tab && clickData.redirectUrl) tab.location.href = clickData.redirectUrl;
                          else if (tab) tab.close();
                        } catch {
                          if (tab) tab.close();
                        }
                      }}
                      disabled={!rate.deepLink}
                      title={rate.deepLink ? 'Open provider-returned link' : 'Provider search unavailable'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {rate.deepLink ? 'Open provider' : 'Unavailable'}
                    </button>
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
                Full comparison view &rarr;
              </Link>
              <Link
                href={`/trips?hotelKey=${hotelKey}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
              >
                Save to trip planner &rarr;
              </Link>
              <ShareModal
                url={typeof window !== 'undefined' ? `${window.location.origin}/hotel/${hotelKey}` : ''}
                title={data.hotel.name}
                description={`Compare prices for ${data.hotel.name} in ${data.hotel.city} from available providers`}
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
                  checkIn={data.checkIn}
                  checkOut={data.checkOut}
                  currentPrice={data.cheapest.total / nights}
                  currency={data.currency}
                />
              </div>
            )}

            {/* Holiday warning */}
            <HolidayWarning
              country={displayHotel.country}
              checkIn={data.checkIn}
              checkOut={data.checkOut}
              className="mt-4"
            />

            {/* Price in other currencies */}
            {data.cheapest && (
              <PriceInCurrencies
                amount={data.cheapest.total}
                baseCurrency={data.currency}
                className="mt-4"
              />
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
            <div className="text-5xl mb-4">&#128269;</div>
            <p className="text-lg font-medium">No prices available for these dates</p>
            <p className="text-sm mt-2">Try different dates or check the full comparison page.</p>
          </div>
        )}

        {/* Initial prompt */}
        {!loading && !searched && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-5xl mb-4">&#128197;</div>
            <p className="text-lg">Select dates above to compare provider-returned prices when available</p>
          </div>
        )}

        {/* Price history chart */}
        <PriceHistory hotelKey={hotelKey} className="mt-8" />

        {/* Provider data availability notice */}
        {data?.cheapest && (
          <ProviderDataNotice provider={data.cheapest.provider} className="mt-6" />
        )}

        {/* Price calendar heatmap */}
        <PriceCalendar hotelKey={hotelKey} className="mt-8" />

        {/* Best time to book */}
        <BestTimeToBook hotelKey={hotelKey} hotelName={displayHotel.name} />

        {/* 30-day price trend chart */}
        <div className="mt-8">
          <PriceTrend hotelKey={hotelKey} nights={nights || 1} currency={currency} />
        </div>

        {/* About the city */}
        <CityDescription city={displayHotel.city} className="mt-8" />

        {/* Nearby attractions + Weather + Flights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <NearbyAttractions city={displayHotel.city} />
          <WeatherWidget
            city={displayHotel.city}
            checkIn={data?.checkIn}
          />
          <FlightDataNotice city={displayHotel.city} />
        </div>

        {/* Guest reviews */}
        <ReviewHighlights
          hotelKey={hotelKey}
          hotelName={displayHotel.name}
          className="mt-8"
        />

        {/* Hotel policies */}
        <HotelPolicies className="mt-8" />

        {/* Travel checklist */}
        <TravelChecklist hotelKey={hotelKey} className="mt-8" />

        {/* Similar hotels */}
        <SimilarHotels
          currentHotelKey={hotelKey}
          city={displayHotel.city}
          country={displayHotel.country}
        />
      </div>
    </div>
  );
}
