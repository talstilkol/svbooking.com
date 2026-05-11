import SearchAutocomplete from "@/components/SearchAutocomplete";
import DestinationExplorer from "@/components/DestinationExplorer";
import TopDeals from "@/components/TopDeals";
import ProviderLogos from "@/components/ProviderLogos";
import RecentlyViewed from "@/components/RecentlyViewed";
import HowItWorks from "@/components/HowItWorks";
import StatsBar from "@/components/StatsBar";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import FAQ from "@/components/FAQ";
import TrustBadges from "@/components/TrustBadges";
import PopularCities from "@/components/PopularCities";
import WhyChooseUs from "@/components/WhyChooseUs";
import TrendingHotels from "@/components/TrendingHotels";
import CityWeatherGrid from "@/components/CityWeatherGrid";
import FeatureHighlight from "@/components/FeatureHighlight";
import LazySection from "@/components/LazySection";
import Link from "next/link";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero with background image */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-blue-800/40 to-sky-50" />
        <div className="relative py-24 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              Find Your Perfect Stay
            </h1>
            <p className="text-xl text-white/90 mb-10 drop-shadow">
              Compare prices from Booking.com, Expedia, Hotels.com, Agoda & more
            </p>
            <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-2xl max-w-3xl mx-auto">
              <Suspense fallback={<div className="h-14 bg-slate-100 rounded-xl animate-pulse" />}>
                <SearchAutocomplete />
              </Suspense>
              <ProviderLogos className="mt-4 justify-center" />
            </div>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="bg-white border-b border-slate-100 py-6">
        <TrustBadges />
      </div>

      {/* Stats bar */}
      <StatsBar />

      {/* Recently Viewed */}
      <Suspense fallback={null}>
        <RecentlyViewed />
      </Suspense>

      {/* Trending Hotels */}
      <div className="max-w-7xl mx-auto px-4 pt-10">
        <Suspense fallback={null}>
          <TrendingHotels />
        </Suspense>
      </div>

      {/* Top Deals */}
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-8">
        <Suspense fallback={null}>
          <TopDeals />
        </Suspense>
      </div>

      {/* How it works */}
      <HowItWorks />

      {/* Popular Cities */}
      <PopularCities />

      {/* City Weather Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <CityWeatherGrid />
      </div>

      {/* Destination Explorer */}
      <LazySection>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            Explore by destination
          </h2>
          <p className="text-center text-slate-500 mb-8">
            Select a region to see the best deals
          </p>
          <DestinationExplorer />
        </div>
      </LazySection>

      {/* Testimonials */}
      <LazySection>
        <Testimonials />
      </LazySection>

      {/* Newsletter */}
      <LazySection>
        <Newsletter />
      </LazySection>

      {/* Why Choose Us */}
      <LazySection>
        <WhyChooseUs />
      </LazySection>

      {/* Feature Highlight */}
      <LazySection>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <FeatureHighlight />
        </div>
      </LazySection>

      {/* FAQ */}
      <LazySection>
        <FAQ />
      </LazySection>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Get started</h2>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/search" className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all font-medium">
            Browse Hotels
          </Link>
          <Link href="/compare" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm">
            Compare Prices
          </Link>
          <Link href="/deals" className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium shadow-sm">
            Today&apos;s Deals
          </Link>
          <Link href="/explore" className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all font-medium">
            Explore Destinations
          </Link>
          <Link href="/agents" className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-sm">
            AI Agents
          </Link>
        </div>
      </div>
    </div>
  );
}
