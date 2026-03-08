import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Equal, GitCompare } from "lucide-react";
import { useVideoComparison, type VideoComparisonData } from "@/hooks/use-video-comparison";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function CompareIndicator({ a, b }: { a: number; b: number }) {
  if (a > b) return <ArrowUpRight className="h-3 w-3 text-green-500" />;
  if (a < b) return <ArrowDownRight className="h-3 w-3 text-red-500" />;
  return <Equal className="h-3 w-3 text-muted-foreground" />;
}

function MetricRow({ label, valueA, valueB, format }: { label: string; valueA: number; valueB: number; format?: (n: number) => string }) {
  const fmt = format ?? formatNum;
  const diff = valueA - valueB;
  const pctDiff = valueB > 0 ? ((diff / valueB) * 100).toFixed(1) : "∞";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="text-right">
        <span className="text-sm font-semibold text-foreground">{fmt(valueA)}</span>
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <CompareIndicator a={valueA} b={valueB} />
          <span className={`text-[10px] ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
            {diff >= 0 ? "+" : ""}{pctDiff}%
          </span>
        </div>
      </div>
      <div className="text-left">
        <span className="text-sm font-semibold text-foreground">{fmt(valueB)}</span>
      </div>
    </div>
  );
}

export function VideoComparisonTool() {
  const { data: videos } = useVideoComparison();
  const [videoA, setVideoA] = useState<string>("");
  const [videoB, setVideoB] = useState<string>("");

  const a = videos.find((v) => v.id === videoA);
  const b = videos.find((v) => v.id === videoB);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          Video Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Video A</p>
            <Select value={videoA} onValueChange={setVideoA}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select video..." /></SelectTrigger>
              <SelectContent>
                {videos.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === videoB}>
                    <span className="truncate">{v.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Video B</p>
            <Select value={videoB} onValueChange={setVideoB}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select video..." /></SelectTrigger>
              <SelectContent>
                {videos.map((v) => (
                  <SelectItem key={v.id} value={v.id} disabled={v.id === videoA}>
                    <span className="truncate">{v.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {a && b ? (
          <div className="rounded-lg border border-border p-3 space-y-0">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 pb-2 mb-2 border-b border-border">
              <p className="text-xs font-medium text-foreground text-right truncate">{a.title}</p>
              <span className="text-xs text-muted-foreground">vs</span>
              <p className="text-xs font-medium text-foreground text-left truncate">{b.title}</p>
            </div>
            <MetricRow label="Views" valueA={a.views} valueB={b.views} />
            <MetricRow label="CTR" valueA={a.ctr_percent} valueB={b.ctr_percent} format={(n) => `${n.toFixed(1)}%`} />
            <MetricRow label="Likes" valueA={a.likes} valueB={b.likes} />
            <MetricRow label="Comments" valueA={a.comments} valueB={b.comments} />
            <MetricRow label="Watch Time" valueA={a.watch_time_minutes} valueB={b.watch_time_minutes} format={(n) => `${formatNum(n)} min`} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select two videos to compare their performance side-by-side
          </p>
        )}
      </CardContent>
    </Card>
  );
}
