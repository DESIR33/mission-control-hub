import { lazy, Suspense } from "react";

/**
 * Optimization #10: Lazy-load react-markdown + remark-gfm.
 * Only loads when markdown content needs rendering.
 */

const ReactMarkdown = lazy(() => import("react-markdown"));

interface LazyMarkdownProps {
  children: string;
  className?: string;
  remarkPlugins?: any[];
}

export function LazyMarkdown({ children, className, remarkPlugins }: LazyMarkdownProps) {
  return (
    <Suspense fallback={<div className="animate-pulse text-muted-foreground text-sm">Loading…</div>}>
      <ReactMarkdown className={className} remarkPlugins={remarkPlugins}>
        {children}
      </ReactMarkdown>
    </Suspense>
  );
}
