'use client';

import { useState } from 'react';

const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  ILS: 3.62,
  JPY: 149.50,
  THB: 34.20,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  AED: 3.67,
  INR: 83.10,
  SGD: 1.34,
};

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', ILS: '₪', JPY: '¥', THB: '฿',
  AUD: 'A$', CAD: 'C$', CHF: 'Fr', AED: 'د.إ', INR: '₹', SGD: 'S$',
};

export default function CurrencyConverter({ className = '' }: { className?: string }) {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('EUR');

  const convert = (amt: number, fromCur: string, toCur: string): number => {
    const usd = amt / (RATES[fromCur] || 1);
    return usd * (RATES[toCur] || 1);
  };

  const result = convert(amount, from, to);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-bold text-slate-900 mb-4">💱 Currency Converter</h3>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">Amount</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 block mb-1">From</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.keys(RATES).map((c) => (
                <option key={c} value={c}>{SYMBOLS[c]} {c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={swap}
            className="mt-4 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full hover:bg-slate-200 transition text-sm"
            aria-label="Swap currencies"
          >
            ⇄
          </button>

          <div className="flex-1">
            <label className="text-[10px] text-slate-500 block mb-1">To</label>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.keys(RATES).map((c) => (
                <option key={c} value={c}>{SYMBOLS[c]} {c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">
            {SYMBOLS[from]}{amount.toLocaleString()} {from} =
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {SYMBOLS[to]}{result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {to}
          </p>
          <p className="text-[9px] text-slate-500 mt-1">
            Rate: 1 {from} = {convert(1, from, to).toFixed(4)} {to}
          </p>
        </div>

        <p className="text-[9px] text-slate-500 text-center">
          Indicative rates only. Actual rates may vary by provider.
        </p>
      </div>
    </div>
  );
}
