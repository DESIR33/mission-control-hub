import { lazy, Suspense } from "react";

/**
 * Optimization #10: Lazy-load react-markdown + remark-gfm.
 * Only loads when markdown content needs rendering.
 */

const ReactMarkdown = lazy(() => import("react-markdown"));

interface LazyMarkdownProps {
  children: string;
  remarkPlugins?: any[];
}

export function LazyMarkdown({ children, remarkPlugins }: LazyMarkdownProps) {
  return (
    <Suspense fallback={<div className="animate-pulse text-muted-foreground text-sm">Loading…</div>}>
      <ReactMarkdown remarkPlugins={remarkPlugins}>
        {children}
      </ReactMarkdown>
    </Suspense>
  );
}
