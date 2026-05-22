'use client';

import { useState } from 'react';
import { Database, Download, ShieldCheck, Trash2, Upload } from 'lucide-react';
import {
  LOCAL_STORAGE_EXPORT_KEYS,
  readLocalStorageExportData,
  removeLocalStorageKeys,
  writeLocalStorageExportData,
} from '@/lib/local-storage-keys';

function downloadJson(data: Record<string, unknown>) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `svbooking-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DataExport({ className = '' }: { className?: string }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState('');

  const exportData = async () => {
    setExporting(true);
    setStatus('');
    try {
      const data: Record<string, unknown> = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        app: 'SVBooking',
        localDeviceData: readLocalStorageExportData(),
      };

      const accountRes = await fetch('/api/me/data', { cache: 'no-store' });
      if (accountRes.ok) {
        data.accountData = await accountRes.json();
      } else {
        data.accountData = {
          status: 'unavailable',
          reason: accountRes.status === 401 ? 'not-authenticated' : 'request-failed',
        };
      }

      downloadJson(data);
      setExported(true);
      setStatus('Export includes local device data and available account data.');
      setTimeout(() => setExported(false), 3000);
    } catch {
      setStatus('Export could not be completed right now.');
    } finally {
      setExporting(false);
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const localData: Record<string, unknown> = data.localDeviceData && typeof data.localDeviceData === 'object'
          ? data.localDeviceData as Record<string, unknown>
          : data;

        writeLocalStorageExportData(localData);

        setStatus('Local backup imported. Refreshing...');
        window.setTimeout(() => window.location.reload(), 500);
      } catch {
        setStatus('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    if (!confirm('This will delete all your saved data (favorites, trips, searches, etc.). Continue?')) return;
    setClearing(true);
    setStatus('');

    try {
      removeLocalStorageKeys(LOCAL_STORAGE_EXPORT_KEYS);
      const accountRes = await fetch('/api/me/data', {
        method: 'DELETE',
        headers: { 'x-sv-confirm-delete': 'DELETE_MY_SV_BOOKING_DATA' },
        cache: 'no-store',
      });

      if (!accountRes.ok && accountRes.status !== 401) {
        setStatus('Local data was cleared. Account data deletion could not be verified.');
        return;
      }

      setStatus(accountRes.ok
        ? 'Local and account data deleted. Refreshing...'
        : 'Local data deleted. Sign in to delete account data.');
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setStatus('Local data was cleared. Account data deletion could not be verified.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Your data
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          no-store
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={exportData}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Download className="h-4 w-4" />
            {exported ? 'Downloaded' : exporting ? 'Exporting...' : 'Export data'}
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition cursor-pointer">
            <Upload className="h-4 w-4" />
            Import local backup
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </label>
        </div>

        <p className="text-[10px] text-slate-400">
          Export includes local device records and signed-in account records when available. Import restores local-device records only.
        </p>

        <button
          onClick={clearAllData}
          disabled={clearing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition font-medium disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {clearing ? 'Clearing...' : 'Clear all data'}
        </button>

        {status && (
          <p className="text-[11px] text-slate-500" role="status">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
