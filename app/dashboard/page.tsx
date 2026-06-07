'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
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
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Gradient header */}
      <div className="bg-linear-to-r from-indigo-600 via-blue-600 to-violet-600 text-white py-10 px-4 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-white/70 hover:text-white text-sm mb-3 inline-block transition-colors">
              ← {t('dashboardHome')}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold">{t('dashboardTitle')}</h1>
            <p className="text-white/70 mt-1">{t('dashboardCommandCenter')}</p>
          </div>
          <UserPreferences />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">

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
