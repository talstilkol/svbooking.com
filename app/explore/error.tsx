'use client';

import RouteErrorState from '@/components/RouteErrorState';

export default function ExploreError({
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
      icon="🗺️"
      titleKey="routeErrorExploreTitle"
      descriptionKey="routeErrorExploreDesc"
      secondaryHref="/search"
      secondaryLabelKey="routeErrorBrowseHotels"
      consoleLabel="Explore page error"
    />
  );
}
