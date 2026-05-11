import SearchAutocomplete from "@/components/SearchAutocomplete";
import DestinationExplorer from "@/components/DestinationExplorer";
import TopDeals from "@/components/TopDeals";
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
            </div>
          </div>
        </div>
      </div>

      {/* Top Deals */}
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-8">
        <Suspense fallback={null}>
          <TopDeals />
        </Suspense>
      </div>

      {/* Destination Explorer */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DestinationExplorer />
      </div>

      {/* Features */}
      <div className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mx-auto mb-4">&#127960;</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Wide Selection</h3>
              <p className="text-slate-500">Properties across 10 cities in 9 countries worldwide</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4">&#128176;</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Best Prices</h3>
              <p className="text-slate-500">Compare 8+ providers and find cheaper dates automatically</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mx-auto mb-4">&#129302;</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">AI Agents</h3>
              <p className="text-slate-500">Smart recommendations, deal scanning & personalized suggestions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/search" className="px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all font-medium">
            Browse Hotels
          </Link>
          <Link href="/compare" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm">
            Compare Prices
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
