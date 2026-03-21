import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, TrendingDown, Mail, Users, Youtube, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { formatDistanceToNow } from "date-fns";
import { getGatedFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";

interface AlertItem {
  id: string;
  type: "decay" | "email" | "crm" | "youtube" | "agent";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  source: string;
  created_at: string;
}

const severityStyles: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
};

const typeIcons: Record<string, React.ReactNode> = {
  decay: <TrendingDown className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  crm: <Users className="h-3.5 w-3.5" />,
  youtube: <Youtube className="h-3.5 w-3.5" />,
  agent: <AlertTriangle className="h-3.5 w-3.5" />,
};

export function ProactiveAlertDigest() {
  const { workspaceId } = useWorkspace();
  const { canRefresh } = useEngagementGate();

  const { data: alerts = [] } = useQuery<AlertItem[]>({
    queryKey: ["proactive-alerts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const items: AlertItem[] = [];

      // Content decay alerts
      const { data: decays } = await (supabase as any)
        .from("content_decay_alerts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      for (const d of decays || []) {
        items.push({
          id: d.id,
          type: "decay",
          severity: (d.decline_percent || 0) > 30 ? "critical" : "warning",
          title: `${d.video_title} losing traffic`,
          description: `${d.decay_type}: ${d.decline_percent?.toFixed(0)}% decline`,
          source: "YouTube",
          created_at: d.created_at,
        });
      }

      // Strategist notifications
      const { data: notifs } = await (supabase as any)
        .from("strategist_notifications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      for (const n of notifs || []) {
        items.push({
          id: n.id,
          type: "agent",
          severity: "info",
          title: n.title,
          description: n.body,
          source: "Agent System",
          created_at: n.created_at,
        });
      }

      // Follow-ups overdue
      const { data: followUps } = await (supabase as any)
        .from("email_follow_ups")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("completed_at", null)
        .lt("due_date", new Date().toISOString())
        .order("due_date")
        .limit(5);

      for (const f of followUps || []) {
        items.push({
          id: f.id,
          type: "email",
          severity: f.priority === "high" ? "critical" : "warning",
          title: `Follow-up overdue`,
          description: f.reason,
          source: "Inbox",
          created_at: f.created_at,
        });
      }

      return items.sort((a, b) => {
        const sev = { critical: 0, warning: 1, info: 2 };
        return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
      });
    },
    enabled: !!workspaceId,
    ...getFreshness("proactiveAlerts"),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Proactive Alert Digest
          {alerts.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">All clear — no alerts right now.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${severityStyles[alert.severity]}`}>
                  <div className="mt-0.5 shrink-0">{typeIcons[alert.type]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium truncate">{alert.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{alert.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{alert.source}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
