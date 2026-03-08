import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Youtube, Handshake, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface VideoRevenue {
  title: string;
  adRevenue: number;
  sponsorRevenue: number;
  totalRevenue: number;
  views: number;
  rpm: number;
}

export function RevenuePerVideo() {
  const { workspaceId } = useWorkspace();

  const { data: videoRevenues = [], isLoading } = useQuery<VideoRevenue[]>({
    queryKey: ["revenue-per-video", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Get video stats with revenue
      const { data: stats } = await (supabase as any)
        .from("youtube_video_stats")
        .select("youtube_video_id, title, views, estimated_revenue")
        .eq("workspace_id", workspaceId)
        .order("estimated_revenue", { ascending: false })
        .limit(15);

      if (!stats) return [];

      // Get sponsorship deals linked to videos
      const { data: deals } = await (supabase as any)
        .from("deals")
        .select("title, value, notes, stage, company_id")
        .eq("workspace_id", workspaceId)
        .eq("stage", "closed_won")
        .is("deleted_at", null);

      // Simple mapping: check if deal title mentions video title
      const dealValues = new Map<string, number>();
      for (const d of deals || []) {
        if (d.value) {
          // Try to match deal to video by title keywords
          for (const s of stats) {
            const titleWords = s.title?.toLowerCase().split(/\s+/) || [];
            const dealTitle = d.title?.toLowerCase() || "";
            if (titleWords.some((w: string) => w.length > 3 && dealTitle.includes(w))) {
              dealValues.set(s.youtube_video_id, (dealValues.get(s.youtube_video_id) || 0) + d.value);
            }
          }
        }
      }

      return stats.map((s: any) => {
        const adRevenue = s.estimated_revenue || 0;
        const sponsorRevenue = dealValues.get(s.youtube_video_id) || 0;
        const totalRevenue = adRevenue + sponsorRevenue;
        const views = s.views || 1;
        return {
          title: s.title || "Untitled Video",
          adRevenue,
          sponsorRevenue,
          totalRevenue,
          views,
          rpm: (totalRevenue / views) * 1000,
        };
      }).sort((a: VideoRevenue, b: VideoRevenue) => b.totalRevenue - a.totalRevenue);
    },
    enabled: !!workspaceId,
  });

  const chartData = videoRevenues.slice(0, 8).map((v) => ({
    name: v.title.length > 20 ? v.title.slice(0, 20) + "…" : v.title,
    "Ad Revenue": Math.round(v.adRevenue * 100) / 100,
    "Sponsor Revenue": Math.round(v.sponsorRevenue * 100) / 100,
  }));

  const totalAd = videoRevenues.reduce((s, v) => s + v.adRevenue, 0);
  const totalSponsor = videoRevenues.reduce((s, v) => s + v.sponsorRevenue, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Revenue Attribution per Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-border rounded-lg p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Ad Revenue</p>
            <p className="text-sm font-bold text-green-600">${totalAd.toFixed(0)}</p>
          </div>
          <div className="border border-border rounded-lg p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Sponsorships</p>
            <p className="text-sm font-bold text-blue-600">${totalSponsor.toFixed(0)}</p>
          </div>
          <div className="border border-border rounded-lg p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-sm font-bold text-foreground">${(totalAd + totalSponsor).toFixed(0)}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Ad Revenue" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Sponsor Revenue" stackId="a" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Video List */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground text-center py-6">Loading...</p>
            ) : videoRevenues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No revenue data yet.</p>
            ) : (
              videoRevenues.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border border-border">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{v.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        <Youtube className="h-2 w-2 mr-0.5" />${v.adRevenue.toFixed(0)}
                      </Badge>
                      {v.sponsorRevenue > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <Handshake className="h-2 w-2 mr-0.5" />${v.sponsorRevenue.toFixed(0)}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        RPM: ${v.rpm.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0 ml-2">${v.totalRevenue.toFixed(0)}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
