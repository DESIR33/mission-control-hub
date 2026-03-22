import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNewsletterTopicRetention } from "@/hooks/use-newsletter-issues";
import { Tag, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopicRetentionCard() {
  const { data: topics = [], isLoading } = useNewsletterTopicRetention();

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          Topic Retention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No topic data yet</p>
        ) : (
          <div className="space-y-2">
            {topics.slice(0, 10).map((t) => {
              const isGood = t.retention_score >= 60;
              return (
                <div key={t.id} className="flex items-center gap-3 py-1">
                  <span className="text-sm font-medium text-foreground w-32 truncate">{t.topic}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", isGood ? "bg-success" : "bg-warning")}
                      style={{ width: `${Math.min(t.retention_score, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isGood ? (
                      <TrendingUp className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-warning" />
                    )}
                    <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                      {Math.round(t.retention_score)}%
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(t.avg_open_rate)}% open · {Math.round(t.avg_click_rate)}% click
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
