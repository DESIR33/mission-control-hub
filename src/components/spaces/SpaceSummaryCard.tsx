import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Briefcase, CheckCircle2, FileEdit, Calendar, Layers, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { SpaceStats } from "@/hooks/use-space-stats";
import { SpaceStatusDonut } from "./SpaceStatusDonut";
import { SpacePriorityChart } from "./SpacePriorityChart";

const domainIcons: Record<string, typeof Shield> = {
  Shield: Shield,
  Briefcase: Briefcase,
};

const statusColors: Record<string, string> = {
  done: "text-emerald-500",
  in_progress: "text-primary",
  todo: "text-muted-foreground",
  cancelled: "text-destructive",
};

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-primary text-primary-foreground",
  low: "bg-muted text-muted-foreground",
};

interface Props {
  space: SpaceStats;
}

export function SpaceSummaryCard({ space }: Props) {
  const navigate = useNavigate();
  const Icon = domainIcons[space.domain_icon || ""] || Layers;

  const statusData = useMemo(() => [
    { name: "Done", value: space.completed, color: "hsl(var(--primary))" },
    { name: "In Progress", value: space.in_progress, color: "hsl(142 76% 36%)" },
    { name: "To Do", value: space.todo, color: "hsl(var(--muted-foreground))" },
    { name: "Cancelled", value: space.cancelled, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0), [space]);

  const completionPct = space.total > 0 ? Math.round((space.completed / space.total) * 100) : 0;

  return (
    <Card className="border bg-card overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ backgroundColor: space.domain_color ? `${space.domain_color}20` : undefined }}
          >
            <Icon className="w-5 h-5" style={{ color: space.domain_color || undefined }} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{space.domain_name}</CardTitle>
            <p className="text-xs text-muted-foreground">{space.total} total tasks</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={space.completed_last_7}
            sub="in the last 7 days"
            color="text-emerald-500"
          />
          <StatCard
            icon={FileEdit}
            label="Updated"
            value={space.updated_last_7}
            sub="in the last 7 days"
            color="text-primary"
          />
          <StatCard
            icon={Layers}
            label="Created"
            value={space.created_last_7}
            sub="in the last 7 days"
            color="text-muted-foreground"
          />
          <StatCard
            icon={Calendar}
            label="Due soon"
            value={space.due_soon}
            sub="in the next 7 days"
            color="text-warning"
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status overview */}
          <Card className="border bg-background/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Status overview</CardTitle>
              <p className="text-xs text-muted-foreground">Snapshot of task statuses</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {space.total > 0 ? (
                <SpaceStatusDonut data={statusData} centerLabel={`${completionPct}%`} centerSub="Complete" />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">No tasks yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="border bg-background/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
              <p className="text-xs text-muted-foreground">Latest task updates</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {space.recent_activity.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {space.recent_activity.map((item) => (
                    <button
                      key={item.id}
                      className="w-full flex items-start gap-2 text-left rounded-md p-2 hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/tasks/${item.id}`)}
                    >
                      <div className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0", {
                        "bg-emerald-500": item.status === "done",
                        "bg-primary": item.status === "in_progress",
                        "bg-muted-foreground": item.status === "todo",
                        "bg-destructive": item.status === "cancelled",
                      })} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-card-foreground">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                        {item.status.replace("_", " ")}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>

          {/* Priority breakdown */}
          <Card className="border bg-background/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Priority breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">How work is prioritized</p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <SpacePriorityChart
                urgent={space.urgent}
                high={space.high}
                medium={space.medium}
                low={space.low}
              />
            </CardContent>
          </Card>

          {/* Projects */}
          {space.projects.length > 0 && (
            <Card className="border bg-background/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <p className="text-xs text-muted-foreground">{space.projects.length} projects in this space</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {space.projects.map((p) => {
                    const pct = p.task_count > 0 ? Math.round((p.completed_count / p.task_count) * 100) : 0;
                    return (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => navigate(`/tasks/projects/${p.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.completed_count}/{p.task_count} tasks done</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-lg font-bold text-foreground">{value}</span>
      </div>
      <p className="text-xs font-medium text-card-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
