'use client';

import { useLocale } from '@/components/LocaleProvider';

interface TimelineStep {
  label: string;
  description: string;
  icon: string;
  status: 'complete' | 'active' | 'upcoming';
}

interface BookingTimelineProps {
  checkIn: string;
  checkOut: string;
  hasCompared?: boolean;
  hasSaved?: boolean;
  className?: string;
}

export default function BookingTimeline({
  checkIn,
  checkOut,
  hasCompared = false,
  hasSaved = false,
  className = '',
}: BookingTimelineProps) {
  const { t } = useLocale();
  const steps: TimelineStep[] = [
    {
      label: t('btSearch'),
      description: t('btFindHotel'),
      icon: '🔍',
      status: 'complete',
    },
    {
      label: t('btCompare'),
      description: checkIn && checkOut
        ? t('btCompareDates').replace('{checkIn}', checkIn).replace('{checkOut}', checkOut)
        : t('btSelectDates'),
      icon: '📊',
      status: hasCompared ? 'complete' : checkIn ? 'active' : 'upcoming',
    },
    {
      label: t('btSave'),
      description: hasSaved ? t('btSaved') : t('btSaveToPlanner'),
      icon: '💾',
      status: hasSaved ? 'complete' : hasCompared ? 'active' : 'upcoming',
    },
    {
      label: t('btBook'),
      description: t('btBookProvider'),
      icon: '✈️',
      status: 'upcoming',
    },
  ];

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('btJourney')}</h3>
      <div className="flex items-start">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex-1 relative">
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={`absolute top-4 left-[calc(50%+16px)] right-0 h-0.5 ${
                  step.status === 'complete' ? 'bg-green-400' : 'bg-slate-200'
                }`}
              />
            )}

            <div className="flex flex-col items-center text-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2 ${
                  step.status === 'complete'
                    ? 'bg-green-100 ring-2 ring-green-400'
                    : step.status === 'active'
                    ? 'bg-blue-100 ring-2 ring-blue-400 animate-pulse'
                    : 'bg-slate-100'
                }`}
              >
                {step.status === 'complete' ? '✓' : step.icon}
              </div>
              <span
                className={`text-xs font-semibold ${
                  step.status === 'complete'
                    ? 'text-green-700'
                    : step.status === 'active'
                    ? 'text-blue-700'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 max-w-[80px]">
                {step.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
