import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferralLeaderboard } from "@/hooks/use-subscriber-referrals";
import { Trophy, Medal, Award, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const rankIcons = [Trophy, Medal, Award];
const rankColors = ["text-yellow-500", "text-muted-foreground", "text-amber-700"];

export function ReferralLeaderboard() {
  const { data: leaderboard = [], isLoading } = useReferralLeaderboard();

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Referral Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No referrals yet</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, idx) => {
              const Icon = rankIcons[idx] ?? Users;
              const color = rankColors[idx] ?? "text-muted-foreground";
              return (
                <div key={entry.referrer_id} className="flex items-center gap-3 py-1.5">
                  <div className="w-6 text-center">
                    {idx < 3 ? (
                      <Icon className={cn("w-4 h-4 mx-auto", color)} />
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {entry.referrer_name || entry.referrer_email || entry.referrer_id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs font-mono">
                      {entry.confirmed_count} referral{entry.confirmed_count !== 1 ? "s" : ""}
                    </Badge>
                    {entry.total_rewards > 0 && (
                      <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">
                        {entry.total_rewards} pts
                      </Badge>
                    )}
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
