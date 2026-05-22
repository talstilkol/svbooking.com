'use client';

import { useId, useState } from 'react';

const PROVIDERS: Record<string, { name: string; logo: string; color: string; desc: string; founded: string }> = {
  'Booking.com': {
    name: 'Booking.com',
    logo: '🔵',
    color: 'bg-blue-50 border-blue-200',
    desc: 'Large global online travel agency and hotel booking marketplace',
    founded: '1996',
  },
  'Expedia': {
    name: 'Expedia',
    logo: '🟡',
    color: 'bg-yellow-50 border-yellow-200',
    desc: 'Major US-based travel platform with bundle deals',
    founded: '1996',
  },
  'Hotels.com': {
    name: 'Hotels.com',
    logo: '🔴',
    color: 'bg-red-50 border-red-200',
    desc: 'Part of Expedia Group, known for loyalty rewards program',
    founded: '1991',
  },
  'Agoda.com': {
    name: 'Agoda',
    logo: '🟣',
    color: 'bg-purple-50 border-purple-200',
    desc: 'Leading Asia-Pacific hotel booking platform',
    founded: '2005',
  },
  'Vio.com': {
    name: 'Vio.com',
    logo: '🟢',
    color: 'bg-green-50 border-green-200',
    desc: 'Budget-focused comparison platform with exclusive deals',
    founded: '2014',
  },
  'Trip.com': {
    name: 'Trip.com',
    logo: '🔷',
    color: 'bg-sky-50 border-sky-200',
    desc: 'Global travel service with strong Asia coverage',
    founded: '1999',
  },
};

interface ProviderInfoProps {
  provider: string;
  className?: string;
}

export default function ProviderInfo({ provider, className = '' }: ProviderInfoProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const info = PROVIDERS[provider];

  if (!info) return null;

  return (
    <span className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="text-slate-400 hover:text-blue-500 transition text-xs"
        aria-label={`Info about ${provider}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-describedby={open ? panelId : undefined}
      >
        &#9432;
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div id={panelId} role="tooltip" className={`absolute bottom-full left-0 mb-2 w-56 p-3 rounded-lg border shadow-lg z-40 ${info.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{info.logo}</span>
              <span className="font-semibold text-sm text-slate-800">{info.name}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{info.desc}</p>
            <p className="text-xs text-slate-400 mt-1">Founded: {info.founded}</p>
          </div>
        </>
      )}
    </span>
  );
}
