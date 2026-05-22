'use client';

interface HotelBadgesProps {
  className?: string;
}

export default function HotelBadges({ className = '' }: HotelBadgesProps) {
  return (
    <div className={`text-xs text-slate-500 ${className}`}>
      Verified property badges are unavailable until supplied by a verified provider.
    </div>
  );
}
