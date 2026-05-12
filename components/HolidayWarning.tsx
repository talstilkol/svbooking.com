'use client';

import { useState, useEffect } from 'react';

interface Holiday {
  date: string;
  name: string;
  localName: string;
}

interface HolidayWarningProps {
  country: string;
  checkIn: string;
  checkOut: string;
  className?: string;
}

/**
 * Shows a warning when travel dates overlap with public holidays.
 * Uses the free Nager.Date API (no auth required).
 * Helps travelers avoid expensive holiday weekends or plan around them.
 */
export default function HolidayWarning({
  country,
  checkIn,
  checkOut,
  className = '',
}: HolidayWarningProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!country || !checkIn || !checkOut) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/holidays?country=${encodeURIComponent(country)}&checkIn=${checkIn}&checkOut=${checkOut}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.holidays) {
          setHolidays(data.holidays);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [country, checkIn, checkOut]);

  if (loading || holidays.length === 0) return null;

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <span className="text-amber-600 text-lg mt-0.5">📅</span>
        <div>
          <p className="text-sm font-medium text-amber-800">
            Public Holiday{holidays.length > 1 ? 's' : ''} During Your Stay
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            Prices may be higher during public holidays. Consider adjusting your dates.
          </p>
          <div className="mt-2 space-y-1">
            {holidays.map((h) => (
              <div key={h.date} className="flex items-center gap-2 text-xs">
                <span className="text-amber-700 font-medium">
                  {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-amber-600">
                  {h.localName !== h.name ? `${h.localName} (${h.name})` : h.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
