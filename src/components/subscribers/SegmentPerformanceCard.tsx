import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNewsletterSegmentStats } from "@/hooks/use-newsletter-issues";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  issueId: string | null;
}

export function SegmentPerformanceCard({ issueId }: Props) {
  const { data: segments = [], isLoading } = useNewsletterSegmentStats(issueId);

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Segment Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {issueId ? "No segment data for this issue" : "Select an issue to see segment stats"}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border">
              <span>Segment</span>
              <span className="text-right">Recipients</span>
              <span className="text-right">Open %</span>
              <span className="text-right">Click %</span>
            </div>
            {segments.map((seg) => {
              const openPct = seg.recipient_count > 0 ? Math.round((seg.open_count / seg.recipient_count) * 100) : 0;
              const clickPct = seg.recipient_count > 0 ? Math.round((seg.click_count / seg.recipient_count) * 100) : 0;
              return (
                <div key={seg.id} className="grid grid-cols-4 text-sm items-center">
                  <span className="font-medium text-foreground truncate">{seg.segment_name}</span>
                  <span className="text-right text-muted-foreground font-mono">{seg.recipient_count}</span>
                  <span className={cn("text-right font-mono", openPct >= 30 ? "text-success" : openPct >= 15 ? "text-warning" : "text-destructive")}>
                    {openPct}%
                  </span>
                  <span className={cn("text-right font-mono", clickPct >= 5 ? "text-success" : clickPct >= 2 ? "text-warning" : "text-destructive")}>
                    {clickPct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
