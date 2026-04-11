import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Brain, BookOpen, ThumbsUp, ThumbsDown, Lightbulb, FlaskConical,
  MessageSquare, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { safeFormat } from "@/lib/date-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type TimelineEvent = {
  id: string;
  type: "feedback" | "memory" | "experiment" | "execution";
  title: string;
  description: string;
  date: string;
  agentSlug?: string;
  positive?: boolean;
};

export function AgentMemoryTimeline() {
  const { workspaceId } = useWorkspace();

  const { data: events = [], isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["agent-memory-timeline", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const [feedbackRes, memoryRes, experimentRes, executionRes] = await Promise.all([
        (supabase as any).from("agent_feedback").select("id, agent_slug, action, user_notes, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
        (supabase as any).from("assistant_memory").select("id, content, origin, tags, created_at").eq("workspace_id", workspaceId).in("origin", ["experiment_feedback", "strategy", "agent"]).order("created_at", { ascending: false }).limit(20),
        (supabase as any).from("video_optimization_experiments").select("id, video_title, experiment_type, status, lesson_learned, started_at").eq("workspace_id", workspaceId).order("started_at", { ascending: false }).limit(15),
        (supabase as any).from("agent_executions").select("id, agent_slug, status, proposals_created, created_at, duration_ms").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
      ]);

      const items: TimelineEvent[] = [];

      (feedbackRes.data || []).forEach((f: any) => items.push({
        id: `fb-${f.id}`, type: "feedback", agentSlug: f.agent_slug,
        title: `${f.action === "accepted" ? "Approved" : "Rejected"} proposal`,
        description: f.user_notes || `${f.agent_slug} proposal ${f.action}`,
        date: f.created_at, positive: f.action === "accepted",
      }));

      (memoryRes.data || []).forEach((m: any) => items.push({
        id: `mem-${m.id}`, type: "memory",
        title: "Memory saved",
        description: m.content.slice(0, 120),
        date: m.created_at,
      }));

      (experimentRes.data || []).forEach((e: any) => items.push({
        id: `exp-${e.id}`, type: "experiment",
        title: `${e.experiment_type} experiment — ${e.status}`,
        description: e.lesson_learned || e.video_title,
        date: e.started_at, positive: e.status === "completed",
      }));

      (executionRes.data || []).forEach((ex: any) => items.push({
        id: `exec-${ex.id}`, type: "execution", agentSlug: ex.agent_slug,
        title: `${ex.agent_slug} ran`,
        description: `${ex.proposals_created} proposals in ${((ex.duration_ms || 0) / 1000).toFixed(1)}s`,
        date: ex.created_at, positive: ex.status === "completed",
      }));

      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
    },
    enabled: !!workspaceId,
  });

  const iconMap: Record<string, React.ElementType> = {
    feedback: ThumbsUp, memory: BookOpen, experiment: FlaskConical, execution: Brain,
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Agent Memory Timeline</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">{events.length} events</Badge>
      </div>
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading timeline…</div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No agent activity yet.</div>
        ) : (
          <div className="relative px-4 py-3">
            <div className="absolute left-7 top-0 bottom-0 w-px bg-border" />
            {events.map((ev) => {
              const Icon = iconMap[ev.type] || Lightbulb;
              return (
                <div key={ev.id} className="relative flex gap-3 pb-4">
                  <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    ev.positive === true ? "bg-green-500/10 text-green-500" :
                    ev.positive === false ? "bg-red-500/10 text-red-500" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                      {ev.agentSlug && <Badge variant="outline" className="text-[9px] h-4">{ev.agentSlug}</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{ev.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {safeFormat(ev.date, "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
