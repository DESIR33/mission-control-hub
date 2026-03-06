import {
  Video, Trophy, TrendingUp, Flame, Activity,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface CompetitorActivity {
  id: string;
  workspace_id: string;
  competitor_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  detected_at: string;
}

const activityTypeConfig: Record<
  string,
  { icon: typeof Video; color: string; badgeClass: string }
> = {
  new_video: {
    icon: Video,
    color: "text-blue-500",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  milestone: {
    icon: Trophy,
    color: "text-yellow-500",
    badgeClass: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  growth_spike: {
    icon: TrendingUp,
    color: "text-green-500",
    badgeClass: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  viral_video: {
    icon: Flame,
    color: "text-orange-500",
    badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
};

const defaultConfig = {
  icon: Activity,
  color: "text-muted-foreground",
  badgeClass: "bg-muted text-muted-foreground border-border",
};

function formatActivityType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function CompetitorActivityFeed() {
  const { workspaceId } = useWorkspace();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["competitor-activity", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_activity" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("detected_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as CompetitorActivity[];
    },
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Competitor Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Competitor Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No competitor activity detected yet.</p>
            <p className="text-xs mt-1">
              Activity from tracked competitors will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const config =
                activityTypeConfig[activity.activity_type] ?? defaultConfig;
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className="rounded-lg border border-border bg-card p-3 flex items-start gap-3"
                >
                  <div
                    className={`mt-0.5 rounded-md p-1.5 bg-muted/50 shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 ${config.badgeClass}`}
                      >
                        {formatActivityType(activity.activity_type)}
                      </Badge>
                    </div>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.detected_at), {
                        addSuffix: true,
                      })}
                    </p>
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
