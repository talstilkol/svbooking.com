'use client';

import { useEffect, useState } from 'react';

const MESSAGES = [
  'Checking Booking.com...',
  'Checking Expedia...',
  'Checking Hotels.com...',
  'Checking Agoda...',
  'Checking Trip.com...',
  'Checking Vio.com...',
  'Comparing prices...',
  'Finding the best deal...',
];

interface LoadingOverlayProps {
  active: boolean;
  className?: string;
}

export default function LoadingOverlay({ active, className = '' }: LoadingOverlayProps) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setMsgIdx(0);
      setProgress(0);
      return;
    }

    const msgTimer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 800);

    const progTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progTimer);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
      <div className="flex flex-col items-center">
        {/* Spinner */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-600">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Message */}
        <p className="text-sm font-medium text-slate-600 animate-pulse">
          {MESSAGES[msgIdx]}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Comparing prices from 8+ providers
        </p>

        {/* Provider dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i <= Math.floor(progress / 15)
                  ? 'bg-green-400'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
