'use client';

import RouteErrorState from '@/components/RouteErrorState';

export default function DashboardError({
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
      icon="📋"
      titleKey="routeErrorDashboardTitle"
      descriptionKey="routeErrorDashboardDesc"
      secondaryHref="/"
      secondaryLabelKey="routeErrorGoHome"
      consoleLabel="Dashboard page error"
    />
  );
}
