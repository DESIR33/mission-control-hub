import { useContentRevenue } from "@/hooks/use-content-revenue";
import { DollarSign } from "lucide-react";

const fmtMoney = (n: number) => {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export function TopContentRevenue() {
  const { data: summary, isLoading } = useContentRevenue(30);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="h-4 w-40 bg-muted rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-muted/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary || summary.links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-semibold text-foreground">Top Earning Content</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          No revenue data yet. Sync YouTube Analytics and link deals to see content revenue.
        </p>
      </div>
    );
  }

  const top5 = summary.links.slice(0, 5);
  const maxRevenue = top5[0]?.totalRevenue ?? 1;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-green-500" />
        <h3 className="text-sm font-semibold text-foreground">Top Earning Content</h3>
      </div>

      <div className="space-y-2.5">
        {top5.map((video, i) => {
          const adPct = video.totalRevenue > 0 ? (video.adRevenue / video.totalRevenue) * 100 : 0;
          const dealPct = video.totalRevenue > 0 ? (video.dealRevenue / video.totalRevenue) * 100 : 0;
          const affiliatePct = video.totalRevenue > 0 ? (video.affiliateRevenue / video.totalRevenue) * 100 : 0;
          const barWidth = (video.totalRevenue / maxRevenue) * 100;

          return (
            <div key={video.videoQueueId} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-foreground truncate flex-1">
                  <span className="text-muted-foreground mr-1">#{i + 1}</span>
                  {video.videoTitle}
                </p>
                <span className="text-xs font-mono font-semibold text-green-500 shrink-0">
                  {fmtMoney(video.totalRevenue)}
                </span>
              </div>
              {/* Revenue source bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden flex" style={{ width: `${barWidth}%` }}>
                {adPct > 0 && <div className="h-full" style={{ width: `${adPct}%`, backgroundColor: "hsl(var(--chart-2))" }} />}
                {dealPct > 0 && <div className="h-full" style={{ width: `${dealPct}%`, backgroundColor: "hsl(var(--chart-1))" }} />}
                {affiliatePct > 0 && <div className="h-full" style={{ width: `${affiliatePct}%`, backgroundColor: "hsl(var(--chart-4))" }} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} /> Ad
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} /> Deal
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--chart-4))" }} /> Affiliate
        </span>
      </div>
    </div>
  );
}
