'use client';

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your preferences and data</p>
          </div>
          <UserPreferences />
        </div>

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
  );
}
