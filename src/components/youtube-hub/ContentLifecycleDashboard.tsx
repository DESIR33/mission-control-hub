import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useVideoRevenueLookup } from "@/hooks/use-video-revenue-lookup";
import { useMemo } from "react";

type Lifecycle = "growing" | "plateau" | "decaying" | "new";

function getLifecycle(views: number, daysOld: number): Lifecycle {
  if (daysOld < 14) return "new";
  const dailyRate = views / Math.max(daysOld, 1);
  if (dailyRate > 100) return "growing";
  if (dailyRate > 20) return "plateau";
  return "decaying";
}

const lifecycleConfig: Record<Lifecycle, { icon: typeof TrendingUp; label: string; color: string }> = {
  growing: { icon: TrendingUp, label: "Growing", color: "text-green-500" },
  plateau: { icon: Minus, label: "Plateau", color: "text-amber-500" },
  decaying: { icon: TrendingDown, label: "Decaying", color: "text-red-500" },
  new: { icon: Activity, label: "New", color: "text-blue-500" },
};

export function ContentLifecycleDashboard() {
  const { data: videos = [] } = useVideoQueue();
  const { lookup } = useVideoRevenueLookup();

  const lifecycleData = useMemo(() => {
    return videos.slice(0, 20).map((video) => {
      const revenue = video.youtubeVideoId ? lookup.get(video.youtubeVideoId) : undefined;
      const publishDate = video.targetPublishDate ? new Date(video.targetPublishDate) : new Date(video.created_at);
      const daysOld = Math.floor((Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
      const views = revenue?.views ?? 0;
      const lifecycle = getLifecycle(views, daysOld);
      return { ...video, views, daysOld, lifecycle, revenue: revenue?.totalRevenue ?? 0 };
    });
  }, [videos, lookup]);

  const counts = { growing: 0, plateau: 0, decaying: 0, new: 0 };
  lifecycleData.forEach((v) => counts[v.lifecycle]++);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Content Lifecycle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(counts) as Lifecycle[]).map((key) => {
            const cfg = lifecycleConfig[key];
            const Icon = cfg.icon;
            return (
              <div key={key} className="rounded-lg border border-border p-2 text-center">
                <Icon className={`h-4 w-4 mx-auto ${cfg.color}`} />
                <p className="text-lg font-bold text-foreground">{counts[key]}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            );
          })}
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {lifecycleData.map((video) => {
            const cfg = lifecycleConfig[video.lifecycle];
            const Icon = cfg.icon;
            return (
              <div key={video.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground">{video.views.toLocaleString()} views · {video.daysOld}d old</p>
                </div>
                <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
