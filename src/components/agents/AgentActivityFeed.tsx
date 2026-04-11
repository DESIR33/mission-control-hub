import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Bot, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { useExecutions } from "@/hooks/use-agents";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

const statusIcon = {
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  running: <Loader2 className="h-3 w-3 text-primary animate-spin" />,
  completed: <CheckCircle className="h-3 w-3 text-green-500" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
};

const statusColor = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-green-500/15 text-green-600 border-green-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

export function AgentActivityFeed() {
  const { data: executions = [], isLoading } = useExecutions(15);

  const liveExecs = executions.filter(e => e.status === "running" || e.status === "pending");
  const recentExecs = executions.filter(e => e.status !== "running" && e.status !== "pending").slice(0, 10);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          Agent Activity
          {liveExecs.length > 0 && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 animate-pulse">
              {liveExecs.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px] px-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : executions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No agent activity yet.</p>
          ) : (
            <div className="space-y-1">
              {liveExecs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Live</p>
                  {liveExecs.map((exec) => (
                    <div key={exec.id} className="flex items-center gap-2 py-2 px-2 rounded-md bg-primary/5 border border-primary/10 mb-1">
                      {statusIcon[exec.status as keyof typeof statusIcon]}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{exec.agent_slug}</p>
                        <p className="text-[10px] text-muted-foreground">{exec.trigger_type} trigger</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${statusColor[exec.status as keyof typeof statusColor]}`}>
                        {exec.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent</p>
              {recentExecs.map((exec) => (
                <div key={exec.id} className="flex items-center gap-2 py-1.5">
                  {statusIcon[exec.status as keyof typeof statusIcon] ?? statusIcon.completed}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{exec.agent_slug}</p>
                    {exec.proposals_created > 0 && (
                      <p className="text-[10px] text-muted-foreground">{exec.proposals_created} proposals</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {safeFormatDistanceToNow(exec.created_at, { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
