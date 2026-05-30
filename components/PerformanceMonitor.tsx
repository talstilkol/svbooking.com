'use client';

import { useEffect, useState } from 'react';

interface PerfMetrics {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  ttfb: number | null;
  fcp: number | null;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

export default function PerformanceMonitor({ className = '' }: { className?: string }) {
  const [metrics, setMetrics] = useState<PerfMetrics>({
    lcp: null,
    inp: null,
    cls: null,
    ttfb: null,
    fcp: null,
  });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // LCP
    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) setMetrics((m) => ({ ...m, lcp: last.startTime }));
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    // INP (Interaction to Next Paint — replaced FID as Core Web Vital March 2024)
    try {
      let maxInp = 0;
      const inpObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEventTiming;
          const duration = e.duration || 0;
          if (duration > maxInp) {
            maxInp = duration;
            setMetrics((m) => ({ ...m, inp: maxInp }));
          }
        }
      });
      inpObs.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    } catch {}

    // CLS
    try {
      let clsValue = 0;
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as LayoutShiftEntry;
          if (!shift.hadRecentInput) {
            clsValue += shift.value || 0;
          }
        }
        setMetrics((m) => ({ ...m, cls: clsValue }));
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    // FCP
    try {
      const fcpObs = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0];
        if (entry) setMetrics((m) => ({ ...m, fcp: entry.startTime }));
      });
      fcpObs.observe({ type: 'paint', buffered: true });
    } catch {}

    // TTFB
    try {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries[0]) {
        queueMicrotask(() => setMetrics((m) => ({ ...m, ttfb: navEntries[0].responseStart })));
      }
    } catch {}
  }, []);

  const getColor = (metric: string, value: number | null): string => {
    if (value === null) return 'text-slate-400';
    switch (metric) {
      case 'lcp': return value <= 2500 ? 'text-green-600' : value <= 4000 ? 'text-amber-600' : 'text-red-600';
      case 'inp': return value <= 200 ? 'text-green-600' : value <= 500 ? 'text-amber-600' : 'text-red-600';
      case 'cls': return value <= 0.1 ? 'text-green-600' : value <= 0.25 ? 'text-amber-600' : 'text-red-600';
      case 'ttfb': return value <= 800 ? 'text-green-600' : value <= 1800 ? 'text-amber-600' : 'text-red-600';
      case 'fcp': return value <= 1800 ? 'text-green-600' : value <= 3000 ? 'text-amber-600' : 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      <button
        onClick={() => setShow(!show)}
        className={`fixed bottom-20 right-4 z-40 w-8 h-8 bg-slate-800 text-white rounded-full text-xs font-bold flex items-center justify-center hover:bg-slate-700 transition ${className}`}
        aria-label="Performance metrics"
        title="Performance Monitor"
      >
        ⚡
      </button>

      {show && (
        <div className="fixed bottom-30 right-4 z-40 bg-slate-900 text-white rounded-xl p-4 shadow-2xl w-64 text-xs font-mono">
          <h4 className="font-bold text-xs text-slate-300 mb-3">Core Web Vitals</h4>
          <div className="space-y-2">
            {[
              { key: 'lcp', label: 'LCP', unit: 'ms', desc: 'Largest Contentful Paint' },
              { key: 'inp', label: 'INP', unit: 'ms', desc: 'Interaction to Next Paint' },
              { key: 'cls', label: 'CLS', unit: '', desc: 'Cumulative Layout Shift' },
              { key: 'ttfb', label: 'TTFB', unit: 'ms', desc: 'Time to First Byte' },
              { key: 'fcp', label: 'FCP', unit: 'ms', desc: 'First Contentful Paint' },
            ].map((m) => {
              const val = metrics[m.key as keyof PerfMetrics];
              return (
                <div key={m.key} className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">{m.label}</span>
                    <span className="text-[9px] text-slate-600 ml-1">({m.desc})</span>
                  </div>
                  <span className={`font-bold ${getColor(m.key, val)}`}>
                    {val !== null
                      ? m.key === 'cls'
                        ? val.toFixed(3)
                        : `${Math.round(val)}${m.unit}`
                      : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
