'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface LocalEventsProps {
  city: string;
  className?: string;
}

interface LocalEvent {
  name: string;
  month?: string;
  icon?: string;
  description?: string;
  date?: string;
  priceRange?: string;
  ticketUrl?: string;
  venue?: string;
}

function hasEvents(value: unknown): value is LocalEvent[] {
  return Array.isArray(value) && value.length > 0;
}

export default function LocalEvents({ city, className = '' }: LocalEventsProps) {
  const { t } = useLocale();
  const [annualEvents, setAnnualEvents] = useState<LocalEvent[] | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<LocalEvent[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetch(`/api/travel-guide?city=${encodeURIComponent(city)}&section=events`).then((res) => res.json()),
      fetch(`/api/events?city=${encodeURIComponent(city)}`).then((res) => res.json()),
    ])
      .then(([guideResult, eventsResult]) => {
        if (cancelled) return;

        if (guideResult.status === 'fulfilled' && hasEvents(guideResult.value?.data)) {
          setAnnualEvents(guideResult.value.data);
        }

        if (eventsResult.status === 'fulfilled' && hasEvents(eventsResult.value?.events)) {
          setUpcomingEvents(eventsResult.value.events.slice(0, 5));
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [city]);

  const hasAnnual = Boolean(annualEvents && annualEvents.length > 0);
  const hasUpcoming = Boolean(upcomingEvents && upcomingEvents.length > 0);

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      {hasAnnual && annualEvents && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900">{t('localEventsHeading').replace('{city}', city)}</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              Wikivoyage
            </span>
          </div>

          <div className="space-y-3">
            {annualEvents.map((event) => (
              <div key={event.name} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-xl shrink-0">{event.icon || '*'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-800">{event.name}</h4>
                    {event.month && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {event.month}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {hasUpcoming && upcomingEvents && (
        <div className={hasAnnual ? 'mt-4 pt-4 border-t border-slate-100' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900">{t('localEventsUpcomingHeading')}</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              {t('localEventsProviderBadge')}
            </span>
          </div>

          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={`${event.name}-${event.date || event.venue || ''}`} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-xl shrink-0">{event.icon || '*'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-800 truncate">{event.name}</h4>
                    {(event.month || event.date) && (
                      <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {event.month || event.date}
                      </span>
                    )}
                  </div>
                  {event.venue && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{event.venue}</p>
                  )}
                  {event.description && (
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
                  )}
                  {event.ticketUrl && (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline mt-1 inline-block"
                    >
                      {t('localEventsDetails')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasAnnual && !hasUpcoming && (
        <p className="text-sm text-slate-500">
          {loaded ? t('localEventsUnavailable').replace('{city}', city) : t('localEventsChecking')}
        </p>
      )}
    </div>
  );
}
