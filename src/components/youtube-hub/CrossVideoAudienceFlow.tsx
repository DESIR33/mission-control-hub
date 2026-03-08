import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Network, ArrowRight, Eye, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmtCount } from "@/lib/chart-theme";

interface VideoNode {
  videoId: string;
  title: string;
  views: number;
}

interface AudienceLink {
  from: VideoNode;
  to: VideoNode;
  strength: number; // 0-100
}

export function CrossVideoAudienceFlow() {
  const { workspaceId } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["cross-video-audience-flow", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { clusters: [], gaps: [] };

      // Get all videos with their stats
      const { data: videos } = await (supabase as any)
        .from("youtube_video_stats")
        .select("video_id, title, views, likes, comments, tags, published_at, description")
        .eq("workspace_id", workspaceId)
        .order("views", { ascending: false })
        .limit(100);

      if (!videos?.length) return { clusters: [], gaps: [] };

      // Build tag-based clusters (since we don't have actual viewer flow data from the API)
      const tagMap = new Map<string, string[]>();
      videos.forEach((v: any) => {
        const tags = v.tags || [];
        tags.forEach((tag: string) => {
          const normalizedTag = tag.toLowerCase().trim();
          if (!tagMap.has(normalizedTag)) tagMap.set(normalizedTag, []);
          tagMap.get(normalizedTag)!.push(v.video_id);
        });
      });

      // Find clusters (groups of videos sharing tags)
      const clusters: { tag: string; videos: any[]; totalViews: number }[] = [];
      tagMap.forEach((videoIds, tag) => {
        if (videoIds.length >= 2) {
          const clusterVideos = videos.filter((v: any) => videoIds.includes(v.video_id));
          clusters.push({
            tag,
            videos: clusterVideos.slice(0, 5),
            totalViews: clusterVideos.reduce((s: number, v: any) => s + (v.views || 0), 0),
          });
        }
      });

      // Sort by total views and deduplicate
      clusters.sort((a, b) => b.totalViews - a.totalViews);
      const topClusters = clusters.slice(0, 8);

      // Find content gaps (popular clusters with few videos)
      const gaps = topClusters
        .filter(c => c.videos.length <= 3 && c.totalViews > 0)
        .map(c => ({
          topic: c.tag,
          existingVideos: c.videos.length,
          avgViews: Math.round(c.totalViews / c.videos.length),
        }));

      return { clusters: topClusters, gaps };
    },
    enabled: !!workspaceId,
  });

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Network className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Cross-Video Audience Flow</h3>
      </div>
      <div className="p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Mapping content clusters…</p>
        ) : (data?.clusters || []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Need more tagged videos to map audience flow.</p>
        ) : (
          <>
            {/* Content Clusters */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content Clusters</h4>
              {data?.clusters.map(cluster => (
                <div key={cluster.tag} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="text-xs">{cluster.tag}</Badge>
                    <span className="text-[10px] text-muted-foreground">{fmtCount(cluster.totalViews)} total views</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {cluster.videos.map((v: any, i: number) => (
                      <div key={v.video_id} className="flex items-center gap-1">
                        <div className="rounded bg-muted/50 px-2 py-1 text-[10px] text-foreground max-w-[120px] truncate">
                          {v.title}
                        </div>
                        {i < cluster.videos.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Content Gaps */}
            {(data?.gaps || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Content Gap Opportunities
                </h4>
                {data?.gaps.map(gap => (
                  <div key={gap.topic} className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{gap.topic}</p>
                      <p className="text-[10px] text-muted-foreground">Only {gap.existingVideos} video{gap.existingVideos > 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-foreground">{fmtCount(gap.avgViews)}</p>
                      <p className="text-[10px] text-muted-foreground">avg views</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
