'use client';

import { useEffect, useState } from 'react';

interface CityGuideProps {
  city: string;
  className?: string;
}

interface TravelGuideSummary {
  title?: string;
  extract?: string | null;
  url?: string | null;
}

interface TravelGuideResponse {
  data?: TravelGuideSummary | null;
  source?: string;
  error?: string;
}

function hasGuideSummary(data: TravelGuideSummary | null | undefined): data is TravelGuideSummary {
  return Boolean(data?.extract && data.extract.trim().length > 0);
}

export default function CityGuide({ city, className = '' }: CityGuideProps) {
  const [guide, setGuide] = useState<TravelGuideResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoaded(false);
      setGuide(null);
    });

    fetch(`/api/travel-guide?city=${encodeURIComponent(city)}&section=overview`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TravelGuideResponse | null) => {
        if (!cancelled) setGuide(data);
      })
      .catch(() => {
        if (!cancelled) setGuide(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  const source = guide?.source || 'unavailable';
  const summary = guide?.data;

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{city} Guide Source</h3>
      <p className="text-xs text-slate-500 mb-4">
        City-guide content is shown only when returned by Wikivoyage or cache.
      </p>

      {!loaded && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Checking verified city-guide source...
        </div>
      )}

      {loaded && hasGuideSummary(summary) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Source: {source}
            </span>
            {summary.url && (
              <a
                href={summary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Open source
              </a>
            )}
          </div>
          {summary.title && (
            <p className="text-sm font-semibold text-slate-800">{summary.title}</p>
          )}
          <p className="text-sm leading-6 text-slate-600">{summary.extract}</p>
        </div>
      )}

      {loaded && !hasGuideSummary(summary) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">City-guide summary unavailable</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            No verified Wikivoyage summary is currently stored for this city. Best-time, tipping,
            transport, and editorial tags are not displayed without a source.
          </p>
        </div>
      )}
    </div>
  );
}
