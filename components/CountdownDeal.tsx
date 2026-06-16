'use client';

import { useEffect, useState } from 'react';
import { getTimeRemaining, getDaysUntil } from '@/lib/time-remaining';
import { useLocale } from '@/components/LocaleProvider';

interface CountdownDealProps {
  checkIn: string;
  className?: string;
}

export default function CountdownDeal({ checkIn, className = '' }: CountdownDealProps) {
  const { t } = useLocale();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);

  useEffect(() => {
    function update() {
      const remaining = getTimeRemaining(checkIn);
      if (remaining.expired) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({ days: remaining.days, hours: remaining.hours, minutes: remaining.minutes });
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
            ? t('countdownUrgent')
            : isNearby
            ? t('countdownNearby')
            : t('countdownApproaching')}
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
            <span className="text-[10px] text-slate-500 block">{t('countdownDays')}</span>
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
            <span className="text-[10px] text-slate-500 block">{t('countdownHours')}</span>
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
            <span className="text-[10px] text-slate-500 block">{t('countdownMinutes')}</span>
          </div>
        </div>
      </div>
      {isUrgent && (
        <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full">
          {t('countdownDateSoon')}
        </span>
      )}
    </div>
  );
}
