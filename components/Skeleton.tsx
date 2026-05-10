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
