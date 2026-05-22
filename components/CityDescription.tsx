'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface CityDescriptionProps {
  city: string;
  className?: string;
}

/**
 * Shows a Wikipedia-sourced city description with thumbnail.
 * Fetches from the free /api/city-info endpoint (no auth required).
 * Provides destination context on hotel detail pages.
 */
export default function CityDescription({ city, className = '' }: CityDescriptionProps) {
  const [data, setData] = useState<{
    extract: string;
    thumbnail?: string;
    url?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(`/api/city-info?city=${encodeURIComponent(city)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.extract) {
          setData(d);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [city]);

  if (loading || !data) return null;

  // Truncate extract to ~250 chars
  const shortText = data.extract.length > 250
    ? data.extract.slice(0, 250).replace(/\s+\S*$/, '') + '...'
    : data.extract;

  return (
    <div className={`bg-white border border-zinc-200 rounded-lg overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row">
        {data.thumbnail && (
          <div className="sm:w-48 h-32 sm:h-auto relative flex-shrink-0">
            <Image
              src={data.thumbnail}
              alt={city}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          </div>
        )}
        <div className="p-4 flex-1">
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <span>About {city}</span>
          </h3>
          <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{shortText}</p>
          {data.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
            >
              Read more on Wikipedia
              <span aria-hidden="true">&#8599;</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
