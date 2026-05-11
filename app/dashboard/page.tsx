'use client';

import { Suspense } from 'react';
import DashboardStats from '@/components/DashboardStats';
import ActivityFeed from '@/components/ActivityFeed';
import QuickActions from '@/components/QuickActions';
import SavedAlertsList from '@/components/SavedAlertsList';
import UpcomingTrips from '@/components/UpcomingTrips';
import LoyaltyBanner from '@/components/LoyaltyBanner';
import RecentlyViewed from '@/components/RecentlyViewed';
import TopDeals from '@/components/TopDeals';
import UserPreferences from '@/components/UserPreferences';
import OnboardingTour from '@/components/OnboardingTour';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Your booking command center</p>
          </div>
          <UserPreferences />
        </div>

        {/* Onboarding */}
        <OnboardingTour className="mb-6" />

        {/* Loyalty Banner */}
        <LoyaltyBanner className="mb-6" />

        {/* Stats Grid */}
        <DashboardStats className="mb-6" />

        {/* Quick Actions */}
        <QuickActions className="mb-6" />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Activity + Alerts */}
          <div className="lg:col-span-2 space-y-6">
            <ActivityFeed />
            <SavedAlertsList />
          </div>

          {/* Right: Upcoming Trips */}
          <div className="space-y-6">
            <UpcomingTrips />
          </div>
        </div>

        {/* Recently Viewed */}
        <Suspense fallback={null}>
          <RecentlyViewed />
        </Suspense>

        {/* Deals */}
        <div className="mt-8">
          <Suspense fallback={null}>
            <TopDeals />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
