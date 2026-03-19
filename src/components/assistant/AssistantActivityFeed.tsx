import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bot, CheckCircle2, AlertTriangle, Mail, Calendar,
  TrendingUp, FileText, Zap, Clock, ListTodo, MessageSquareText, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAssistantActions, useTasks } from "@/hooks/use-assistant-actions";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<string, typeof Bot> = {
  stale_deal_detected: AlertTriangle,
  deadline_approaching: Calendar,
  follow_up_due: Clock,
  content_gap: FileText,
  inbox_triage: Mail,
  daily_briefing: TrendingUp,
  task_created: ListTodo,
};

const ACTION_COLORS: Record<string, string> = {
  stale_deal_detected: "text-warning",
  deadline_approaching: "text-destructive",
  follow_up_due: "text-primary",
  content_gap: "text-muted-foreground",
  inbox_triage: "text-accent-foreground",
  daily_briefing: "text-success",
  task_created: "text-primary",
};

const COMMAND_EXAMPLES = [
  { icon: Clock, text: "Follow up with sponsors who haven't replied in 7 days", category: "CRM" },
  { icon: Mail, text: "Triage my inbox and flag anything urgent", category: "Email" },
  { icon: TrendingUp, text: "Which videos had the best RPM this month?", category: "Analytics" },
  { icon: ListTodo, text: "Create a task to review Q2 brand deals by Friday", category: "Tasks" },
  { icon: AlertTriangle, text: "Show me deals that have been stuck for over 2 weeks", category: "Pipeline" },
  { icon: FileText, text: "Draft a follow-up email for Acme Corp's sponsorship", category: "Outreach" },
  { icon: Calendar, text: "What deadlines do I have coming up this week?", category: "Schedule" },
  { icon: TrendingUp, text: "Compare my revenue this quarter vs last quarter", category: "Finance" },
];

export function AssistantActivityFeed() {
  const { data: actions = [], isLoading } = useAssistantActions(30);
  const { data: tasks = [] } = useTasks();

  const taskStats = useMemo(() => {
    const todo = tasks.filter((t: any) => t.status === "todo").length;
    const inProgress = tasks.filter((t: any) => t.status === "in_progress").length;
    const overdue = tasks.filter((t: any) =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
    ).length;
    const assistantCreated = tasks.filter((t: any) => t.source === "assistant").length;
    return { todo, inProgress, overdue, assistantCreated };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Tasks", value: taskStats.todo, icon: ListTodo, color: "text-primary" },
          { label: "In Progress", value: taskStats.inProgress, icon: Zap, color: "text-warning" },
          { label: "Overdue", value: taskStats.overdue, icon: AlertTriangle, color: "text-destructive" },
          { label: "AI Created", value: taskStats.assistantCreated, icon: Bot, color: "text-accent-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className="text-lg font-bold font-mono text-card-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Command Examples */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">Try Asking</h3>
          <Badge variant="secondary" className="text-xs ml-auto">
            <Sparkles className="w-3 h-3 mr-1" />Natural Language
          </Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {COMMAND_EXAMPLES.map((cmd, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-default group"
            >
              <cmd.icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-card-foreground leading-relaxed">{cmd.text}</p>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{cmd.category}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">Assistant Activity</h3>
          <Badge variant="secondary" className="text-xs ml-auto">{actions.length} actions</Badge>
        </div>

        {actions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No assistant activity yet. The AI will start generating proposals and tasks from your data signals.
          </div>
        ) : (
          <div className="space-y-1">
            {actions.map((action, i) => {
              const Icon = ACTION_ICONS[action.action_type] || CheckCircle2;
              const color = ACTION_COLORS[action.action_type] || "text-muted-foreground";
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <div className={cn("mt-0.5 shrink-0", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground">{action.title}</p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
