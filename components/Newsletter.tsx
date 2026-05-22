'use client';

import { useState } from 'react';
import { LOCAL_STORAGE_KEYS, readLocalStorageJsonWithFallback, writeLocalStorageJson } from '@/lib/local-storage-keys';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Store signup locally (no backend)
    try {
      const existing = readLocalStorageJsonWithFallback<{ email: string; date: string }[]>(
        LOCAL_STORAGE_KEYS.newsletter,
        [],
        []
      );
      writeLocalStorageJson(LOCAL_STORAGE_KEYS.newsletter, [...existing, { email, date: new Date().toISOString() }]);
    } catch { /* ignore */ }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="bg-blue-50 border-y border-blue-100 py-12 text-center">
        <div className="max-w-md mx-auto px-4">
          <div className="text-3xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-blue-800 mb-1">You&apos;re subscribed!</h3>
          <p className="text-sm text-blue-600">
            Your alert signup is saved locally. Email delivery remains unavailable until a production notification provider is configured.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-blue-50 border-y border-blue-100 py-12">
      <div className="max-w-md mx-auto px-4 text-center">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Save local deal-alert preferences
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Store alert preferences locally until production email delivery is configured.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 border border-blue-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition shrink-0"
          >
            Subscribe
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-3">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  );
}
