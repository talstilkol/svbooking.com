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
import HomeExploreHeading from "@/components/home/HomeExploreHeading";
import HomeQuickLinks from "@/components/home/HomeQuickLinks";
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
          <HomeExploreHeading />
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
      <HomeQuickLinks />
    </div>
  );
}
