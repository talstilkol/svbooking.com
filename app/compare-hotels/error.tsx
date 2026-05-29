'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function CompareHotelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Compare hotels page error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-6 opacity-80">⚖️</div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Hotel comparison failed
        </h2>
        <p className="text-slate-600 mb-2">
          We could not load the comparison data. Comparison data may be temporarily unavailable.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-500 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Try again
          </button>
          <Link
            href="/compare"
            className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all font-medium"
          >
            Back to Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
