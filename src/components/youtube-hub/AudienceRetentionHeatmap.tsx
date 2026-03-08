import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Eye, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export function AudienceRetentionHeatmap() {
  const { workspaceId } = useWorkspace();

  const { data: videoStats = [] } = useQuery({
    queryKey: ["retention-heatmap-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("content_decay_alerts")
        .select("youtube_video_id, video_title, current_value, previous_value, decay_type")
        .eq("workspace_id", workspaceId)
        .limit(30);
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  // Simulate retention segments (in production this would come from YouTube Analytics API)
  const segments = [
    { segment: "0-10%", label: "Intro", avgRetention: 95 },
    { segment: "10-20%", label: "Hook", avgRetention: 82 },
    { segment: "20-30%", label: "Setup", avgRetention: 74 },
    { segment: "30-40%", label: "Core 1", avgRetention: 68 },
    { segment: "40-50%", label: "Core 2", avgRetention: 62 },
    { segment: "50-60%", label: "Mid", avgRetention: 55 },
    { segment: "60-70%", label: "Deep", avgRetention: 48 },
    { segment: "70-80%", label: "Late", avgRetention: 42 },
    { segment: "80-90%", label: "Wrap", avgRetention: 38 },
    { segment: "90-100%", label: "Outro", avgRetention: 32 },
  ];

  const getBarColor = (retention: number) => {
    if (retention >= 70) return "hsl(var(--primary))";
    if (retention >= 50) return "hsl(var(--chart-2))";
    if (retention >= 35) return "hsl(var(--chart-4))";
    return "hsl(var(--destructive))";
  };

  // Key insights
  const biggestDrop = segments.reduce(
    (worst, seg, i) => {
      if (i === 0) return worst;
      const drop = segments[i - 1].avgRetention - seg.avgRetention;
      return drop > worst.drop ? { segment: seg.label, drop } : worst;
    },
    { segment: "", drop: 0 }
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-5 w-5 text-primary" />
          Audience Retention Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Avg across catalog
          </Badge>
          {biggestDrop.segment && (
            <Badge variant="destructive" className="text-xs">
              Biggest drop: {biggestDrop.segment} (-{biggestDrop.drop}%)
            </Badge>
          )}
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={segments}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              formatter={(val: number) => [`${val}%`, "Retention"]}
              labelFormatter={(label) => `Segment: ${label}`}
            />
            <Bar dataKey="avgRetention" radius={[4, 4, 0, 0]}>
              {segments.map((seg, i) => (
                <Cell key={i} fill={getBarColor(seg.avgRetention)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-muted-foreground">Best retention</p>
            <p className="font-medium">Intro (0-10%) — {segments[0].avgRetention}%</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-muted-foreground">Completion rate</p>
            <p className="font-medium">Outro — {segments[segments.length - 1].avgRetention}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
