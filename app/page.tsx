import {RegisterLink, LoginLink} from "@kinde-oss/kinde-auth-nextjs/components";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="bg-linear-to-r from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">Find Your Perfect Stay</h1>
          <p className="text-xl mb-8">Discover amazing places at unbeatable prices</p>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-xl max-w-3xl mx-auto">
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🏨</div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Wide Selection</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Choose from thousands of properties worldwide</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Best Prices</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Guaranteed lowest prices for your stay</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">Secure Booking</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Your data is always protected</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <div className="flex justify-center gap-4">
          <LoginLink className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Sign in
          </LoginLink>
          <RegisterLink className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Sign up
          </RegisterLink>
          <Link href="/search" className="px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-900 transition-colors">
            Browse All Listings
          </Link>
          <Link href="/compare" className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            Compare Hotel Prices
          </Link>
        </div>
      </div>
    </div>
  )
}
