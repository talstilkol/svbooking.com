'use client';

interface FlightDataNoticeProps {
  city: string;
  className?: string;
}

export default function FlightDataNotice({ city, className = '' }: FlightDataNoticeProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-1">Flight price data for {city}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">
        Verified flight price data is unavailable. Prices, airlines, and durations are not displayed until they come from a verified flight provider.
      </p>
    </div>
  );
}
