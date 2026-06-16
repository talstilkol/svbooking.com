'use client';

import { useState, useEffect } from 'react';
import {
  getLegacyTravelChecklistStorageKey,
  getTravelChecklistStorageKey,
  readLocalStorageJsonWithFallback,
  writeLocalStorageJson,
} from '@/lib/local-storage-keys';
import { useLocale } from '@/components/LocaleProvider';

interface ChecklistItem {
  id: string;
  label?: string;
  checked: boolean;
}

const CHECKLIST_ITEMS = [
  { id: 'passport', labelKey: 'tcPassport' },
  { id: 'insurance', labelKey: 'tcInsurance' },
  { id: 'flights', labelKey: 'tcFlights' },
  { id: 'hotel', labelKey: 'tcHotel' },
  { id: 'transport', labelKey: 'tcTransport' },
  { id: 'currency', labelKey: 'tcCurrency' },
  { id: 'packing', labelKey: 'tcPacking' },
  { id: 'documents', labelKey: 'tcDocuments' },
];

interface TravelChecklistProps {
  hotelKey?: string;
  className?: string;
}

function normalizeChecklistItems(stored: unknown): ChecklistItem[] {
  const storedItems = Array.isArray(stored) ? stored : [];
  const checkedById = new Map(
    storedItems
      .filter((item): item is ChecklistItem => Boolean(item && typeof item.id === 'string'))
      .map((item) => [item.id, Boolean(item.checked)])
  );
  return CHECKLIST_ITEMS.map((item) => ({
    id: item.id,
    checked: Boolean(checkedById.get(item.id)),
  }));
}

export default function TravelChecklist({ hotelKey, className = '' }: TravelChecklistProps) {
  const { t } = useLocale();
  const storageKey = getTravelChecklistStorageKey(hotelKey);
  const legacyStorageKey = getLegacyTravelChecklistStorageKey(hotelKey);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const defaults = normalizeChecklistItems(null);
      const stored = readLocalStorageJsonWithFallback<ChecklistItem[]>(
        storageKey,
        [legacyStorageKey],
        defaults
      );
      setItems(normalizeChecklistItems(stored));
    });
    return () => {
      cancelled = true;
    };
  }, [legacyStorageKey, storageKey]);

  const toggle = (id: string) => {
    const updated = items.map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i
    );
    setItems(updated);
    writeLocalStorageJson(storageKey, updated);
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;
  const labelFor = (id: string) => {
    const item = CHECKLIST_ITEMS.find((candidate) => candidate.id === id);
    return item ? t(item.labelKey) : id;
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 transition ${className}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">✅ {t('tcHeading')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('tcItemsCompleted').replace('{checked}', String(checkedCount)).replace('{total}', String(items.length))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-blue-600 text-sm font-medium">{t('tcOpen')} →</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">✅ {t('tcHeading')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('tcDoneCount').replace('{checked}', String(checkedCount)).replace('{total}', String(items.length))}
          </p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-slate-500 hover:text-slate-600"
        >
          {t('tcCollapse')} ↑
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
              item.checked ? 'bg-green-50' : 'hover:bg-slate-50'
            }`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggle(item.id)}
              className="w-4 h-4 rounded accent-green-600"
            />
            <span
              className={`text-sm ${
                item.checked
                  ? 'text-green-700 line-through'
                  : 'text-slate-700'
              }`}
            >
              {labelFor(item.id)}
            </span>
          </label>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-sm font-medium text-green-700">{t('tcCompleted')}</p>
        </div>
      )}
    </div>
  );
}
