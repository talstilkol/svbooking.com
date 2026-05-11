'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string; // ISO date string
  label?: string;
  className?: string;
}

function getTimeRemaining(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

export default function Countdown({ targetDate, label, className = '' }: CountdownProps) {
  const [time, setTime] = useState(() => getTimeRemaining(new Date(targetDate)));

  useEffect(() => {
    const target = new Date(targetDate);
    const interval = setInterval(() => {
      setTime(getTimeRemaining(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (time.expired) {
    return (
      <div className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`}>
        <span>✓</span>
        <span>{label ? `${label} has passed` : 'Expired'}</span>
      </div>
    );
  }

  const blocks = [
    { value: time.days, label: 'days' },
    { value: time.hours, label: 'hrs' },
    { value: time.minutes, label: 'min' },
    { value: time.seconds, label: 'sec' },
  ];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
      <div className="flex gap-1">
        {blocks.map((b) => (
          <div
            key={b.label}
            className="bg-slate-900 text-white rounded-lg px-2 py-1 text-center min-w-[36px]"
          >
            <div className="text-sm font-bold font-mono leading-tight">
              {String(b.value).padStart(2, '0')}
            </div>
            <div className="text-[8px] text-slate-400 uppercase">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
