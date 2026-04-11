import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths } from "date-fns";
import { safeFormat } from "@/lib/date-utils";

export function PublishCalendarOverlay() {
  const { workspaceId } = useWorkspace();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: videosByDate = new Map<string, any[]>() } = useQuery({
    queryKey: ["publish-calendar", workspaceId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!workspaceId) return new Map();
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      // Use youtube_video_stats or a similar approach
      const { data } = await (supabase as any)
        .from("youtube_video_stats")
        .select("youtube_video_id, title, published_at, views, likes, estimated_revenue")
        .eq("workspace_id", workspaceId)
        .gte("published_at", start.toISOString())
        .lte("published_at", end.toISOString())
        .order("published_at");

      const map = new Map<string, any[]>();
      for (const v of data || []) {
        const dateKey = safeFormat(v.published_at, "yyyy-MM-dd");
        const arr = map.get(dateKey) || [];
        arr.push(v);
        map.set(dateKey, arr);
      }
      return map;
    },
    enabled: !!workspaceId,
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));

  const getPerformanceColor = (videos: any[]): string => {
    if (!videos || videos.length === 0) return "";
    const avgViews = videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0) / videos.length;
    if (avgViews > 10000) return "bg-green-500/20 border-green-500/40";
    if (avgViews > 1000) return "bg-amber-500/20 border-amber-500/40";
    return "bg-blue-500/20 border-blue-500/40";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Publish Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium px-2">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-[10px] text-center text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14" />
          ))}

          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const videos = videosByDate.get(dateKey) || [];
            const perfColor = getPerformanceColor(videos);
            const today = isToday(day);

            return (
              <div
                key={dateKey}
                className={`h-14 rounded border p-1 ${
                  today ? "border-primary/50 bg-primary/5" : "border-border"
                } ${perfColor} transition-colors`}
              >
                <p className={`text-[10px] font-medium ${today ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </p>
                {videos.length > 0 && (
                  <div className="mt-0.5">
                    <Badge variant="secondary" className="text-[8px] px-1 py-0">
                      {videos.length} video{videos.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" />
            <span className="text-[10px] text-muted-foreground">10k+ views</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
            <span className="text-[10px] text-muted-foreground">1k+ views</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" />
            <span className="text-[10px] text-muted-foreground">&lt;1k views</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
