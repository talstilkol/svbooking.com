'use client';

import { useEffect, useState } from 'react';

interface LastUpdatedProps {
  className?: string;
}

export default function LastUpdated({ className = '' }: LastUpdatedProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setTime(
      now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    );
  }, []);

  if (!time) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
      <span>Prices updated at {time}</span>
    </div>
  );
}
