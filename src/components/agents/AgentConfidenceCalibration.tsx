import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Target, TrendingUp, TrendingDown, BarChart3, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

interface CalibrationBucket {
  range: string;
  midpoint: number;
  total: number;
  successful: number;
  successRate: number;
}

export function AgentConfidenceCalibration() {
  const { workspaceId } = useWorkspace();

  const { data: buckets = [], isLoading } = useQuery<CalibrationBucket[]>({
    queryKey: ["agent-confidence-calibration", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: proposals } = await (supabase as any)
        .from("ai_proposals")
        .select("confidence, status")
        .eq("workspace_id", workspaceId)
        .in("status", ["approved", "rejected"])
        .not("confidence", "is", null);

      if (!proposals?.length) return [];

      const ranges = [
        { range: "0-20%", min: 0, max: 0.2, midpoint: 10 },
        { range: "20-40%", min: 0.2, max: 0.4, midpoint: 30 },
        { range: "40-60%", min: 0.4, max: 0.6, midpoint: 50 },
        { range: "60-80%", min: 0.6, max: 0.8, midpoint: 70 },
        { range: "80-100%", min: 0.8, max: 1.01, midpoint: 90 },
      ];

      return ranges.map((r) => {
        const inRange = proposals.filter((p: any) => p.confidence >= r.min && p.confidence < r.max);
        const successful = inRange.filter((p: any) => p.status === "approved");
        return {
          range: r.range,
          midpoint: r.midpoint,
          total: inRange.length,
          successful: successful.length,
          successRate: inRange.length > 0 ? Math.round((successful.length / inRange.length) * 100) : 0,
        };
      }).filter(b => b.total > 0);
    },
    enabled: !!workspaceId,
  });

  const isCalibrated = buckets.every(b => Math.abs(b.successRate - b.midpoint) < 20);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Confidence Calibration</h3>
        {buckets.length > 0 && (
          <Badge variant={isCalibrated ? "default" : "destructive"} className="ml-auto text-[10px]">
            {isCalibrated ? "Well Calibrated" : "Needs Adjustment"}
          </Badge>
        )}
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">Loading calibration data…</div>
        ) : buckets.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
            Need more approved/rejected proposals to calibrate.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="midpoint" name="Predicted" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Predicted %", position: "bottom", fontSize: 10 }} />
                <YAxis type="number" dataKey="successRate" name="Actual" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Actual %", angle: -90, position: "left", fontSize: 10 }} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Scatter data={buckets} fill="hsl(var(--primary))">
                  {buckets.map((b, i) => (
                    <Cell key={i} fill={Math.abs(b.successRate - b.midpoint) < 15 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-5 gap-2 mt-3">
              {buckets.map((b) => (
                <div key={b.range} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{b.range}</p>
                  <p className="text-xs font-mono font-bold text-foreground">{b.successRate}%</p>
                  <p className="text-[9px] text-muted-foreground">{b.total} proposals</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
