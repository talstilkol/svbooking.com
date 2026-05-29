import type { Metadata } from "next";
import HomeHero from "@/components/home/HomeHero";
import HomeStats from "@/components/home/HomeStats";
import HomeHowItWorks from "@/components/home/HomeHowItWorks";
import HomeTrending from "@/components/home/HomeTrending";
import DestinationExplorer from "@/components/DestinationExplorer";
import TopDeals from "@/components/TopDeals";
import RecentlyViewed from "@/components/RecentlyViewed";
import TrustBadges from "@/components/TrustBadges";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import FAQ from "@/components/FAQ";
import PopularCities from "@/components/PopularCities";
import WhyChooseUs from "@/components/WhyChooseUs";
import CityWeatherGrid from "@/components/CityWeatherGrid";
import FeatureHighlight from "@/components/FeatureHighlight";
import LazySection from "@/components/LazySection";
import Link from "next/link";
import { Suspense } from "react";
import { CATALOG_STATS } from "@/lib/catalog-stats";

export const metadata: Metadata = {
  title: "SV Booking - Compare Hotel Prices Across Providers",
  description: `Compare hotel prices from multiple providers across ${CATALOG_STATS.hotels} hotels in ${CATALOG_STATS.cities} cities. Find the cheapest rates, discover the best time to book, and save on your next trip.`,
  openGraph: {
    title: "SV Booking - Compare Hotel Prices Across Providers",
    description: `Compare hotel prices across ${CATALOG_STATS.hotels} hotels in ${CATALOG_STATS.cities} cities worldwide. Find the cheapest rates instantly.`,
  },
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
      'he-IL': '/?locale=he',
      'x-default': '/',
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Animated hero with rotating cities + parallax */}
      <Suspense fallback={<div className="min-h-[640px] bg-linear-to-b from-blue-900 to-sky-50" />}>
        <HomeHero />
      </Suspense>

      {/* Trust badges */}
      <div className="bg-white border-b border-slate-100 py-6">
        <TrustBadges />
      </div>

      {/* Animated stats with counters */}
      <Suspense fallback={null}>
        <HomeStats />
      </Suspense>

      {/* Recently Viewed */}
      <Suspense fallback={null}>
        <RecentlyViewed />
      </Suspense>

      {/* Trending Hotels — large image cards with hover */}
      <LazySection>
        <Suspense fallback={null}>
          <HomeTrending />
        </Suspense>
      </LazySection>

      {/* Top Deals */}
      <LazySection>
        <div className="max-w-7xl mx-auto px-4 pt-10 pb-8">
          <Suspense fallback={null}>
            <TopDeals />
          </Suspense>
        </div>
      </LazySection>

      {/* How it works — animated step cards */}
      <LazySection>
        <HomeHowItWorks />
      </LazySection>

      {/* Popular Cities */}
      <LazySection>
        <PopularCities />
      </LazySection>

      {/* City Weather Grid */}
      <LazySection>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <CityWeatherGrid />
        </div>
      </LazySection>

      {/* Destination Explorer */}
      <LazySection>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            Explore by destination
          </h2>
          <p className="text-center text-slate-500 mb-8">
            Select a region to see available rate observations
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
        </div>
      </div>
    </div>
  );
}
