'use client';

import { useState } from 'react';
import { Database, Download, ShieldCheck, Trash2, Upload } from 'lucide-react';
import {
  LOCAL_STORAGE_EXPORT_KEYS,
  readLocalStorageExportData,
  removeLocalStorageKeys,
  writeLocalStorageExportData,
} from '@/lib/local-storage-keys';
import { useLocale } from '@/components/LocaleProvider';

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
  const { t } = useLocale();
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
      setStatus(t('dataExportStatus'));
      setTimeout(() => setExported(false), 3000);
    } catch {
      setStatus(t('dataExportFailed'));
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

        setStatus(t('dataImportStatus'));
        window.setTimeout(() => window.location.reload(), 500);
      } catch {
        setStatus(t('dataInvalidFile'));
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    if (!window.confirm(t('dataClearConfirm'))) return;
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
        setStatus(t('dataClearAccountUnverified'));
        return;
      }

      setStatus(accountRes.ok
        ? t('dataClearAllStatus')
        : t('dataClearLocalStatus'));
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setStatus(t('dataClearAccountUnverified'));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-4 w-4" />
          {t('dataYourData')}
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('dataNoStore')}
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
            {exported ? t('dataDownloaded') : exporting ? t('dataExporting') : t('dataExportData')}
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition cursor-pointer">
            <Upload className="h-4 w-4" />
            {t('dataImportLocalBackup')}
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </label>
        </div>

        <p className="text-[10px] text-slate-500">
          {t('dataExportNote')}
        </p>

        <button
          onClick={clearAllData}
          disabled={clearing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition font-medium disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {clearing ? t('dataClearing') : t('dataClearAllData')}
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
