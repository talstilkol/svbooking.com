'use client';

import { useEffect, useState } from 'react';

interface CountdownDealProps {
  checkIn: string;
  className?: string;
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function CountdownDeal({ checkIn, className = '' }: CountdownDealProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      const target = new Date(checkIn);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ days, hours, minutes });
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [checkIn]);

  if (!timeLeft) return null;

  const daysUntil = getDaysUntil(checkIn);
  const isUrgent = daysUntil <= 3;
  const isNearby = daysUntil <= 7;

  if (daysUntil > 30) return null;

  return (
    <div
      className={`rounded-lg p-3 flex items-center gap-3 ${
        isUrgent
          ? 'bg-red-50 border border-red-200'
          : isNearby
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-blue-50 border border-blue-200'
      } ${className}`}
    >
      <span className="text-xl" aria-hidden="true">
        {isNearby ? '⏰' : '📅'}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-semibold uppercase ${
            isUrgent ? 'text-red-700' : isNearby ? 'text-amber-700' : 'text-blue-700'
          }`}
        >
          {isUrgent
            ? 'Check-in is very close'
            : isNearby
            ? 'Your dates are coming up'
            : 'Check-in approaching'}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-center">
            <span
              className={`text-lg font-bold ${
                isUrgent ? 'text-red-800' : isNearby ? 'text-amber-800' : 'text-blue-800'
              }`}
            >
              {timeLeft.days}
            </span>
            <span className="text-[10px] text-slate-500 block">days</span>
          </div>
          <span className="text-slate-300">:</span>
          <div className="text-center">
            <span
              className={`text-lg font-bold ${
                isUrgent ? 'text-red-800' : isNearby ? 'text-amber-800' : 'text-blue-800'
              }`}
            >
              {timeLeft.hours}
            </span>
            <span className="text-[10px] text-slate-500 block">hrs</span>
          </div>
          <span className="text-slate-300">:</span>
          <div className="text-center">
            <span
              className={`text-lg font-bold ${
                isUrgent ? 'text-red-800' : isNearby ? 'text-amber-800' : 'text-blue-800'
              }`}
            >
              {timeLeft.minutes}
            </span>
            <span className="text-[10px] text-slate-500 block">min</span>
          </div>
        </div>
      </div>
      {isUrgent && (
        <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full">
          DATE SOON
        </span>
      )}
    </div>
  );
}
