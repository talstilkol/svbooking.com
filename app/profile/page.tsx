'use client';

import Link from 'next/link';
import DashboardStats from '@/components/DashboardStats';
import LoyaltyBanner from '@/components/LoyaltyBanner';
import DataExport from '@/components/DataExport';
import OnboardingTour from '@/components/OnboardingTour';
import TripMap from '@/components/TripMap';
import CurrencyConverter from '@/components/CurrencyConverter';
import UserPreferences from '@/components/UserPreferences';
import SavedAlertsList from '@/components/SavedAlertsList';
import UpcomingTrips from '@/components/UpcomingTrips';

export default function ProfilePage() {
  return (
    <div className="min-h-screen">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 text-white py-10 px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-3 inline-block transition-colors">&larr; Home</Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-white/70">Manage your preferences and data</p>
        </div>
      </div>

      <div className="px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        <UserPreferences />

        {/* Onboarding */}
        <OnboardingTour className="mb-6" />

        {/* Loyalty */}
        <LoyaltyBanner className="mb-6" />

        {/* Stats */}
        <DashboardStats className="mb-6" />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <TripMap />
            <SavedAlertsList />
          </div>

          {/* Right */}
          <div className="space-y-6">
            <UpcomingTrips />
            <CurrencyConverter />
            <DataExport />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
