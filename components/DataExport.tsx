'use client';

import { useState } from 'react';

export default function DataExport({ className = '' }: { className?: string }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const exportData = () => {
    setExporting(true);
    try {
      const keys = [
        'hotel-favorites',
        'saved-trips',
        'recently-viewed',
        'sv-recent-searches',
        'sv-user-reviews',
        'price-alerts',
        'sv-loyalty',
        'sv-user-preferences',
        'sv-notifications',
        'sv-compare-list',
      ];

      const data: Record<string, unknown> = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        app: 'SVBooking',
      };

      for (const key of keys) {
        try {
          const val = localStorage.getItem(key);
          if (val) data[key] = JSON.parse(val);
        } catch {}
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `svbooking-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch {}
    setExporting(false);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const keys = [
          'hotel-favorites',
          'saved-trips',
          'recently-viewed',
          'sv-recent-searches',
          'sv-user-reviews',
          'price-alerts',
          'sv-loyalty',
          'sv-user-preferences',
          'sv-notifications',
          'sv-compare-list',
        ];

        for (const key of keys) {
          if (data[key]) {
            localStorage.setItem(key, JSON.stringify(data[key]));
          }
        }

        alert('Data imported successfully! Refreshing...');
        window.location.reload();
      } catch {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (!confirm('This will delete all your saved data (favorites, trips, searches, etc.). Continue?')) return;

    const keys = [
      'hotel-favorites', 'saved-trips', 'recently-viewed', 'sv-recent-searches',
      'sv-user-reviews', 'price-alerts', 'sv-loyalty', 'sv-user-preferences',
      'sv-notifications', 'sv-compare-list',
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-4">💾 Your Data</h3>

      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={exportData}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {exported ? '✓ Downloaded!' : exporting ? 'Exporting...' : '📥 Export Data'}
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer">
            📤 Import Data
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </label>
        </div>

        <p className="text-[10px] text-slate-400">
          Export saves your favorites, trips, searches, reviews, and preferences as a JSON file.
          Import restores them on any device.
        </p>

        <button
          onClick={clearAllData}
          className="w-full px-4 py-2 text-xs text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition font-medium"
        >
          🗑️ Clear All Data
        </button>
      </div>
    </div>
  );
}
