'use client';

import { useState, useEffect, useMemo } from 'react';

interface LocalEventsProps {
  city: string;
  className?: string;
}

interface LocalEvent {
  name: string;
  month: string;
  icon: string;
  description: string;
}

interface LiveEvent extends LocalEvent {
  date?: string;
  priceRange?: string;
  ticketUrl?: string;
  venue?: string;
}

const EVENTS: Record<string, LocalEvent[]> = {
  'Tel Aviv': [
    { name: 'White Night', month: 'Jun', icon: '🌙', description: 'All-night cultural festival with music, art, and performances' },
    { name: 'Pride Parade', month: 'Jun', icon: '🏳️‍🌈', description: 'One of the largest pride events in the Middle East' },
    { name: 'DLD Tel Aviv', month: 'Sep', icon: '💻', description: 'Innovation conference showcasing Israeli tech scene' },
  ],
  'Paris': [
    { name: 'Paris Fashion Week', month: 'Feb/Sep', icon: '👗', description: 'World-renowned haute couture runway shows' },
    { name: 'Bastille Day', month: 'Jul', icon: '🎆', description: 'National holiday with fireworks at the Eiffel Tower' },
    { name: 'Nuit Blanche', month: 'Oct', icon: '🎨', description: 'All-night contemporary art installations citywide' },
  ],
  'London': [
    { name: 'Wimbledon', month: 'Jul', icon: '🎾', description: 'Legendary Grand Slam tennis tournament' },
    { name: 'Notting Hill Carnival', month: 'Aug', icon: '🎭', description: 'Colorful Caribbean carnival with music and dancing' },
    { name: 'New Year Fireworks', month: 'Dec', icon: '🎆', description: 'Spectacular display over the Thames and London Eye' },
  ],
  'Tokyo': [
    { name: 'Cherry Blossom Season', month: 'Mar–Apr', icon: '🌸', description: 'Hanami festivals under beautiful sakura trees' },
    { name: 'Sumida Fireworks', month: 'Jul', icon: '🎆', description: 'Massive fireworks display over the Sumida River' },
    { name: 'Comiket', month: 'Aug/Dec', icon: '📚', description: 'World\'s largest comic market and cosplay convention' },
  ],
  'Dubai': [
    { name: 'Dubai Shopping Festival', month: 'Jan', icon: '🛍️', description: 'Month-long mega sales, entertainment and prizes' },
    { name: 'Dubai World Cup', month: 'Mar', icon: '🏇', description: 'World\'s richest horse race at Meydan Racecourse' },
    { name: 'Global Village', month: 'Oct–Apr', icon: '🌍', description: 'Cultural festival with pavilions from 70+ countries' },
  ],
  'Bangkok': [
    { name: 'Songkran', month: 'Apr', icon: '💦', description: 'Thai New Year water festival — the world\'s biggest water fight' },
    { name: 'Loy Krathong', month: 'Nov', icon: '🏮', description: 'Festival of lights with floating lanterns and candles' },
    { name: 'Chatuchak Weekend Market', month: 'Year-round', icon: '🛒', description: '15,000 stalls in one of the world\'s largest markets' },
  ],
  'Bali': [
    { name: 'Nyepi (Day of Silence)', month: 'Mar', icon: '🤫', description: 'Unique Balinese Hindu day of silence and reflection' },
    { name: 'Galungan', month: 'Varies', icon: '🎋', description: 'Victory of good over evil celebrated with temple ceremonies' },
    { name: 'Bali Spirit Festival', month: 'May', icon: '🧘', description: 'International yoga, dance, and music festival' },
  ],
  'Barcelona': [
    { name: 'La Mercè', month: 'Sep', icon: '🎭', description: 'Barcelona\'s biggest street festival with music and fireworks' },
    { name: 'Mobile World Congress', month: 'Feb', icon: '📱', description: 'World\'s largest mobile technology conference' },
    { name: 'Sant Jordi Day', month: 'Apr', icon: '📖', description: 'Catalan Valentine\'s Day with roses and books' },
  ],
  'Rome': [
    { name: 'Easter Week', month: 'Apr', icon: '⛪', description: 'Papal ceremonies and events at the Vatican' },
    { name: 'Estate Romana', month: 'Jun–Sep', icon: '🎬', description: 'Summer-long festival of outdoor cinema, concerts, and shows' },
    { name: 'Roma Europa Festival', month: 'Sep–Nov', icon: '🎭', description: 'International performing arts festival' },
  ],
  'New York': [
    { name: 'NYC Marathon', month: 'Nov', icon: '🏃', description: 'World\'s largest marathon through all 5 boroughs' },
    { name: 'Thanksgiving Parade', month: 'Nov', icon: '🎈', description: 'Macy\'s iconic parade with giant balloons and floats' },
    { name: 'Times Square NYE', month: 'Dec', icon: '🎆', description: 'Legendary ball drop and celebrations' },
  ],
};

export default function LocalEvents({ city, className = '' }: LocalEventsProps) {
  const staticEvents = useMemo(() => EVENTS[city] || [], [city]);
  const [liveEvents, setLiveEvents] = useState<LocalEvent[] | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<LiveEvent[]>([]);

  // Fetch annual events from Wikivoyage
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/travel-guide?city=${encodeURIComponent(city)}&section=events`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          setLiveEvents(result.data);
          setIsLive(true);
        }
      })
      .catch(() => { /* use static fallback */ });

    return () => { cancelled = true; };
  }, [city]);

  // Fetch upcoming live events from Ticketmaster
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/events?city=${encodeURIComponent(city)}`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return;
        if (result.events && result.events.length > 0) {
          setUpcomingEvents(result.events.slice(0, 5));
        }
      })
      .catch(() => { /* no live events */ });

    return () => { cancelled = true; };
  }, [city]);

  const events = liveEvents || staticEvents;

  if (events.length === 0 && upcomingEvents.length === 0) return null;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      {/* Annual / Notable Events */}
      {events.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900">Events in {city}</h3>
            {isLive && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Wikivoyage
              </span>
            )}
          </div>

          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.name} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-xl shrink-0">{event.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-800">{event.name}</h4>
                    {event.month && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {event.month}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Upcoming Live Events (Ticketmaster) */}
      {upcomingEvents.length > 0 && (
        <div className={events.length > 0 ? 'mt-4 pt-4 border-t border-slate-100' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-900">Upcoming Events</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              Live
            </span>
          </div>

          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={`${event.name}-${event.date}`} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-xl shrink-0">{event.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-800 truncate">{event.name}</h4>
                    {event.month && (
                      <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {event.month}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
