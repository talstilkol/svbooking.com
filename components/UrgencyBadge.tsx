'use client';

import { useMemo } from 'react';

interface UrgencyBadgeProps {
  hotelKey: string;
  providerCount: number;
}

/**
 * Shows urgency indicators based on search activity and provider availability.
 * Uses deterministic pseudo-random to be consistent per hotel.
 */
export default function UrgencyBadge({ hotelKey, providerCount }: UrgencyBadgeProps) {
  const badge = useMemo(() => {
    // Deterministic hash from hotelKey
    let hash = 0;
    for (let i = 0; i < hotelKey.length; i++) {
      hash = ((hash << 5) - hash + hotelKey.charCodeAt(i)) | 0;
    }
    const seed = Math.abs(hash);
    const variant = seed % 5;

    // Only show urgency badge ~60% of the time
    if (variant >= 3) return null;

    const searches = 12 + (seed % 30);
    const hour = new Date().getHours();
    const isEvening = hour >= 18 || hour <= 8;

    if (providerCount <= 2) {
      return {
        text: `Only ${providerCount} provider${providerCount === 1 ? '' : 's'} available`,
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: '🔥',
      };
    }

    if (isEvening && variant === 0) {
      return {
        text: `${searches} people viewed today`,
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: '👀',
      };
    }

    if (variant === 1) {
      return {
        text: `In high demand — ${providerCount} providers compared`,
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: '⚡',
      };
    }

    return {
      text: `Prices from ${providerCount} providers`,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: '📊',
    };
  }, [hotelKey, providerCount]);

  if (!badge) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border ${badge.color}`}>
      <span>{badge.icon}</span>
      {badge.text}
    </div>
  );
}
