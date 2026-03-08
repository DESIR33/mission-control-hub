import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Dna, Star, TrendingUp, Clock, Hash, Image as ImageIcon,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fmtCount } from "@/lib/chart-theme";

interface ContentPattern {
  factor: string;
  avgViews: number;
  avgCtr: number;
  count: number;
  icon: React.ElementType;
}

export function ContentDnaFingerprint() {
  const { workspaceId } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["content-dna", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { patterns: [], topFactors: [] };
      const { data: videos } = await (supabase as any)
        .from("youtube_video_stats")
        .select("title, views, likes, comments, ctr_percent, avg_view_duration_seconds, published_at, tags, description")
        .eq("workspace_id", workspaceId)
        .order("views", { ascending: false })
        .limit(200);

      if (!videos?.length) return { patterns: [], topFactors: [] };

      // Analyze title patterns
      const questionTitles = videos.filter((v: any) => /\?/.test(v.title));
      const howToTitles = videos.filter((v: any) => /how to|tutorial|guide/i.test(v.title));
      const numberTitles = videos.filter((v: any) => /\d+/.test(v.title));
      const shortTitles = videos.filter((v: any) => v.title.length < 40);
      const longTitles = videos.filter((v: any) => v.title.length >= 60);

      const avg = (arr: any[], key: string) => arr.length > 0 ? arr.reduce((s: number, v: any) => s + (Number(v[key]) || 0), 0) / arr.length : 0;

      const patterns: ContentPattern[] = [
        { factor: "Question Titles (?)", avgViews: avg(questionTitles, "views"), avgCtr: avg(questionTitles, "ctr_percent"), count: questionTitles.length, icon: Hash },
        { factor: "How-To/Tutorial", avgViews: avg(howToTitles, "views"), avgCtr: avg(howToTitles, "ctr_percent"), count: howToTitles.length, icon: Star },
        { factor: "Number in Title", avgViews: avg(numberTitles, "views"), avgCtr: avg(numberTitles, "ctr_percent"), count: numberTitles.length, icon: Hash },
        { factor: "Short Title (<40 chars)", avgViews: avg(shortTitles, "views"), avgCtr: avg(shortTitles, "ctr_percent"), count: shortTitles.length, icon: Hash },
        { factor: "Long Title (60+ chars)", avgViews: avg(longTitles, "views"), avgCtr: avg(longTitles, "ctr_percent"), count: longTitles.length, icon: Hash },
      ].filter(p => p.count >= 2);

      // Duration buckets
      const short = videos.filter((v: any) => (v.avg_view_duration_seconds || 0) < 300);
      const medium = videos.filter((v: any) => (v.avg_view_duration_seconds || 0) >= 300 && (v.avg_view_duration_seconds || 0) < 600);
      const long = videos.filter((v: any) => (v.avg_view_duration_seconds || 0) >= 600);

      if (short.length >= 2) patterns.push({ factor: "Short Duration (<5m)", avgViews: avg(short, "views"), avgCtr: avg(short, "ctr_percent"), count: short.length, icon: Clock });
      if (medium.length >= 2) patterns.push({ factor: "Medium Duration (5-10m)", avgViews: avg(medium, "views"), avgCtr: avg(medium, "ctr_percent"), count: medium.length, icon: Clock });
      if (long.length >= 2) patterns.push({ factor: "Long Duration (10m+)", avgViews: avg(long, "views"), avgCtr: avg(long, "ctr_percent"), count: long.length, icon: Clock });

      const topFactors = [...patterns].sort((a, b) => b.avgViews - a.avgViews).slice(0, 5);

      return { patterns, topFactors };
    },
    enabled: !!workspaceId,
  });

  const chartData = (data?.topFactors || []).map(f => ({
    name: f.factor.length > 18 ? f.factor.slice(0, 18) + "…" : f.factor,
    views: Math.round(f.avgViews),
    ctr: Number(f.avgCtr.toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Dna className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Content DNA Fingerprint</h3>
      </div>
      <div className="p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Analyzing your content patterns…</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Need more video data to identify patterns.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmtCount} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avg Views" />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {(data?.patterns || []).map(p => (
                <div key={p.factor} className="flex items-center justify-between text-xs rounded-lg border border-border px-3 py-2">
                  <span className="text-foreground font-medium">{p.factor}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{p.count} videos</span>
                    <span className="font-mono">{fmtCount(p.avgViews)} avg views</span>
                    <Badge variant="outline" className="text-[10px]">{p.avgCtr.toFixed(1)}% CTR</Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
