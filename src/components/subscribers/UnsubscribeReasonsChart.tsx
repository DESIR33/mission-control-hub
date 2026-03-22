import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnsubscribeReasons } from "@/hooks/use-subscriber-churn";
import { UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  too_frequent: "Too Frequent",
  not_relevant: "Not Relevant",
  never_subscribed: "Never Subscribed",
  too_many_emails: "Too Many Emails",
  content_quality: "Content Quality",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  too_frequent: "bg-warning",
  not_relevant: "bg-primary",
  never_subscribed: "bg-muted-foreground",
  too_many_emails: "bg-destructive",
  content_quality: "bg-accent-foreground",
  other: "bg-muted-foreground",
};

export function UnsubscribeReasonsChart() {
  const { data, isLoading } = useUnsubscribeReasons();

  if (isLoading) return <Skeleton className="h-48" />;

  const breakdown = data?.breakdown ?? {};
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserMinus className="w-4 h-4 text-muted-foreground" />
          Unsubscribe Reasons
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No unsubscribe data yet</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(breakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={category} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-28 truncate text-foreground">
                      {categoryLabels[category] ?? category}
                    </span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", categoryColors[category] ?? "bg-muted-foreground")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {count} ({pct}%)
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
