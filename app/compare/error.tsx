'use client';

import RouteErrorState from '@/components/RouteErrorState';

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      icon="📊"
      titleKey="routeErrorCompareTitle"
      descriptionKey="routeErrorCompareDesc"
      secondaryHref="/search"
      secondaryLabelKey="routeErrorBrowseHotels"
      consoleLabel="Compare page error"
    />
  );
}
