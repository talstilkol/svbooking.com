'use client';

import RouteErrorState from '@/components/RouteErrorState';

export default function DealsError({
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
      icon="🏷️"
      titleKey="routeErrorDealsTitle"
      descriptionKey="routeErrorDealsDesc"
      secondaryHref="/search"
      secondaryLabelKey="routeErrorBrowseHotels"
      consoleLabel="Deals page error"
    />
  );
}
