import { lazy, Suspense, type ComponentType } from "react";

/**
 * Optimization #10: Lazy-load wrapper for heavy chart components.
 * Defers loading of Recharts until the chart is actually rendered.
 */

const LazyResponsiveContainer = lazy(() =>
  import("recharts").then((m) => ({ default: m.ResponsiveContainer }))
);

interface LazyChartWrapperProps {
  width?: string | number;
  height?: string | number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm animate-pulse">
    Loading chart…
  </div>
);

export function LazyChartWrapper({
  width = "100%",
  height = 300,
  children,
  fallback,
}: LazyChartWrapperProps) {
  return (
    <Suspense fallback={fallback ?? <DefaultFallback />}>
      <LazyResponsiveContainer width={width} height={height}>
        {children}
      </LazyResponsiveContainer>
    </Suspense>
  );
}
