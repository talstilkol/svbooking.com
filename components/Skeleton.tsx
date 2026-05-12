export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-200 rounded animate-pulse ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="flex gap-2 mt-4">
          <div className="h-9 bg-slate-200 rounded-lg flex-1" />
          <div className="h-9 bg-slate-200 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CompareCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-10 bg-slate-200 rounded-lg w-full mt-4" />
      </div>
    </div>
  );
}

export function PageSkeleton({ headerColor = 'bg-slate-300' }: { headerColor?: string }) {
  return (
    <div className="min-h-screen">
      <div className={`${headerColor} animate-pulse py-10 px-4`}>
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="h-4 bg-white/20 rounded w-16" />
          <div className="h-9 bg-white/20 rounded w-72" />
          <div className="h-4 bg-white/20 rounded w-96 max-w-full" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse space-y-4">
          <div className="h-5 bg-slate-200 rounded w-48" />
          <div className="h-10 bg-slate-200 rounded w-full" />
          <div className="h-10 bg-slate-200 rounded w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
              <div className="h-40 bg-slate-200 rounded-lg" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
