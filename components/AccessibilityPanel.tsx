'use client';

import { useState, useEffect } from 'react';
import {
  LEGACY_LOCAL_STORAGE_KEYS,
  LOCAL_STORAGE_KEYS,
  readLocalStorageJsonWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';

export default function AccessibilityPanel() {
  const panelId = 'accessibility-settings-panel';
  const headingId = 'accessibility-settings-title';
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const prefs = readLocalStorageJsonWithFallback<{
          fontSize?: number;
          highContrast?: boolean;
          reducedMotion?: boolean;
        }>(LOCAL_STORAGE_KEYS.accessibilityPreferences, [LEGACY_LOCAL_STORAGE_KEYS.accessibilityPreferences], {});
        if (prefs.fontSize) setFontSize(prefs.fontSize);
        if (prefs.highContrast) setHighContrast(prefs.highContrast);
        if (prefs.reducedMotion) setReducedMotion(prefs.reducedMotion);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Apply preferences
    document.documentElement.style.fontSize = `${fontSize}%`;

    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    if (reducedMotion) {
      document.documentElement.classList.add('force-reduced-motion');
    } else {
      document.documentElement.classList.remove('force-reduced-motion');
    }

    // Save preferences
    try {
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.accessibilityPreferences, { fontSize, highContrast, reducedMotion });
    } catch {}
  }, [fontSize, highContrast, reducedMotion]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 md:bottom-4 right-4 z-40 w-10 h-10 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-700 transition text-sm"
        aria-label="Accessibility settings"
        aria-expanded={open}
        aria-controls={panelId}
        title="Accessibility settings"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9.31a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="fixed bottom-36 md:bottom-20 right-4 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id={headingId} className="text-sm font-semibold text-slate-800">Accessibility</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close accessibility settings"
              >
                ✕
              </button>
            </div>

            {/* Font size */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 block mb-2">
                Text size: {fontSize}%
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                  className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 text-lg font-bold"
                  aria-label="Decrease font size"
                >
                  A
                </button>
                <input
                  type="range"
                  min={80}
                  max={150}
                  step={10}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                  aria-label="Font size"
                />
                <button
                  onClick={() => setFontSize(Math.min(150, fontSize + 10))}
                  className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 text-xl font-bold"
                  aria-label="Increase font size"
                >
                  A
                </button>
              </div>
            </div>

            {/* High contrast */}
            <label className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm text-slate-700">High contrast</span>
              <button
                role="switch"
                aria-checked={highContrast}
                onClick={() => setHighContrast(!highContrast)}
                className={`w-10 h-6 rounded-full transition relative ${
                  highContrast ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    highContrast ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            {/* Reduced motion */}
            <label className="flex items-center justify-between py-2 cursor-pointer">
              <span className="text-sm text-slate-700">Reduce motion</span>
              <button
                role="switch"
                aria-checked={reducedMotion}
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`w-10 h-6 rounded-full transition relative ${
                  reducedMotion ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    reducedMotion ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            {/* Reset */}
            <button
              onClick={() => {
                setFontSize(100);
                setHighContrast(false);
                setReducedMotion(false);
              }}
              className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition"
            >
              Reset to defaults
            </button>
          </div>
        </>
      )}
    </>
  );
}
