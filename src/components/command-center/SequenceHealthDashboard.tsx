import { useMemo } from "react";
import {
  Send, Mail, Eye, MessageSquare, AlertTriangle, TrendingUp,
  CheckCircle, Clock, Users,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailSequences, useSequenceEnrollments } from "@/hooks/use-email-sequences";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { DistanceToNow } from "date-fns";
import {
import { safeFormatDistanceToNow } from "@/lib/date-utils";
  chartTooltipStyle,
  cartesianGridDefaults,
  xAxisDefaults,
  yAxisDefaults,
} from "@/lib/chart-theme";

interface SendLogEntry {
  id: string;
  sequence_id: string;
  contact_id: string;
  step_number: number;
  status: string;
  to_email: string;
  sent_at: string;
  error_message: string | null;
}

export function SequenceHealthDashboard() {
  const { workspaceId } = useWorkspace();
  const { data: sequences = [], isLoading: seqLoading } = useEmailSequences();

  const { data: sendLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["sequence-health-logs", workspaceId],
    queryFn: async (): Promise<SendLogEntry[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("sequence_send_log" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sent_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as SendLogEntry[];
    },
    enabled: !!workspaceId,
  });

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["sequence-health-enrollments", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("email_sequence_enrollments" as any)
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const health = useMemo(() => {
    const totalSent = sendLogs.filter((l) => l.status === "sent").length;
    const totalFailed = sendLogs.filter((l) => l.status === "failed").length;
    const deliveryRate = totalSent + totalFailed > 0
      ? (totalSent / (totalSent + totalFailed)) * 100
      : 0;

    const activeEnrollments = allEnrollments.filter((e: any) => e.status === "active").length;
    const completedEnrollments = allEnrollments.filter((e: any) => e.status === "completed").length;
    const repliedEnrollments = allEnrollments.filter((e: any) => e.status === "replied").length;
    const totalEnrollments = allEnrollments.length;

    const completionRate = totalEnrollments > 0
      ? ((completedEnrollments + repliedEnrollments) / totalEnrollments) * 100
      : 0;

    const replyRate = totalEnrollments > 0
      ? (repliedEnrollments / totalEnrollments) * 100
      : 0;

    // Per-sequence stats
    const perSequence = sequences.map((seq) => {
      const seqLogs = sendLogs.filter((l) => l.sequence_id === seq.id);
      const seqEnrollments = allEnrollments.filter((e: any) => e.sequence_id === seq.id);
      const sent = seqLogs.filter((l) => l.status === "sent").length;
      const failed = seqLogs.filter((l) => l.status === "failed").length;
      const replied = seqEnrollments.filter((e: any) => e.status === "replied").length;

      return {
        name: seq.name.length > 20 ? seq.name.slice(0, 20) + "..." : seq.name,
        sent,
        failed,
        replied,
        enrolled: seqEnrollments.length,
        status: seq.status,
      };
    });

    // Recent failures
    const recentFailures = sendLogs
      .filter((l) => l.status === "failed")
      .slice(0, 5);

    return {
      totalSent,
      totalFailed,
      deliveryRate,
      activeEnrollments,
      completedEnrollments,
      repliedEnrollments,
      totalEnrollments,
      completionRate,
      replyRate,
      perSequence,
      recentFailures,
      activeSequences: sequences.filter((s) => s.status === "active").length,
    };
  }, [sequences, sendLogs, allEnrollments]);

  const isLoading = seqLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Send className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-foreground">Sequence Health</h2>
        <Badge variant="outline" className="text-xs font-mono">
          {health.activeSequences} active
        </Badge>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Mail className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sent</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{health.totalSent}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivery Rate</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{health.deliveryRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Reply Rate</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{health.replyRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Enrolled</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{health.activeEnrollments}</p>
        </div>
      </div>

      {/* Completion Funnel */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Enrollment Funnel</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1.5">
            {[
              { label: "Total Enrolled", value: health.totalEnrollments, color: "bg-blue-500" },
              { label: "Active", value: health.activeEnrollments, color: "bg-amber-500" },
              { label: "Completed", value: health.completedEnrollments, color: "bg-green-500" },
              { label: "Replied", value: health.repliedEnrollments, color: "bg-purple-500" },
            ].map((item) => {
              const pct = health.totalEnrollments > 0
                ? (item.value / health.totalEnrollments) * 100
                : 0;
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">
                    {item.label}
                  </span>
                  <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-foreground w-8 text-right">
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-Sequence Chart */}
      {health.perSequence.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Per Sequence Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={health.perSequence} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <CartesianGrid {...cartesianGridDefaults} />
              <XAxis dataKey="name" {...xAxisDefaults} />
              <YAxis {...yAxisDefaults} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
              <Bar dataKey="replied" fill="#a855f7" name="Replied" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Failures */}
      {health.recentFailures.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Recent Failures ({health.totalFailed} total)
          </h3>
          <div className="space-y-1">
            {health.recentFailures.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {safeFormatDistanceToNow(log.sent_at, { addSuffix: true })}
                </span>
                <span className="text-foreground truncate">{log.to_email}</span>
                {log.error_message && (
                  <span className="text-destructive truncate text-xs">
                    {log.error_message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {health.totalSent === 0 && health.totalEnrollments === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Send className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            No email sequence activity yet. Create sequences and enroll contacts to see health metrics.
          </p>
        </div>
      )}
    </div>
  );
}
