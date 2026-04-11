import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, Sparkles, ChevronLeft, ChevronRight, Calendar, ListTodo, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { safeFormat, safeFormatDistanceToNow } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";

const q = (table: string) => (supabase as any).from(table);

function classifyLine(text: string): "urgent" | "action" | "win" | "insight" {
  if (text.startsWith("🔴")) return "urgent";
  if (text.startsWith("🟡")) return "action";
  if (text.startsWith("🟢")) return "win";
  return "insight";
}

const typeStyles = {
  urgent: "border-l-destructive bg-destructive/5",
  action: "border-l-warning bg-warning/5",
  win: "border-l-green-500 bg-green-500/5",
  insight: "border-l-primary bg-primary/5",
};

const typeBadge = {
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/30" },
  action: { label: "Action", className: "bg-warning/10 text-warning border-warning/30" },
  win: { label: "Win", className: "bg-green-500/10 text-green-500 border-green-500/30" },
  insight: { label: "Insight", className: "bg-primary/10 text-primary border-primary/30" },
};

/** Infer a navigation route from the briefing text content */
function inferRoute(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("deal") || lower.includes("sponsor") || lower.includes("stale deal"))
    return "/network/deals";
  if (lower.includes("task") || lower.includes("high-priority"))
    return "/tasks/all";
  if (lower.includes("proposal") || lower.includes("ai video"))
    return "/ai/proposals";
  if (lower.includes("content calendar") || lower.includes("content creation"))
    return "/content";
  if (lower.includes("youtube") || lower.includes("video") || lower.includes("views"))
    return "/youtube/dashboard";
  if (lower.includes("revenue") || lower.includes("ad revenue") || lower.includes("monetization"))
    return "/revenue/overview";
  if (lower.includes("subscriber") || lower.includes("newsletter"))
    return "/subscribers/dashboard";
  if (lower.includes("contact") || lower.includes("follow up") || lower.includes("communication"))
    return "/network/contacts";
  if (lower.includes("inbox") || lower.includes("email"))
    return "/inbox";
  if (lower.includes("supabase") || lower.includes("storage") || lower.includes("quota"))
    return "/integrations";
  if (lower.includes("expense") || lower.includes("tax"))
    return "/finance/hub/overview";
  return null;
}

function canConvertToTask(type: string): boolean {
  return type === "urgent" || type === "action";
}

export default function BriefingDetailPage() {
  const { briefingDate } = useParams<{ briefingDate: string }>();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [dismissedItems, setDismissedItems] = useState<Set<number>>(new Set());
  const [creatingTask, setCreatingTask] = useState<number | null>(null);

  const targetDate = briefingDate || safeFormat(new Date(), "yyyy-MM-dd");

  const { data: briefing, isLoading } = useQuery({
    queryKey: ["briefing-detail", workspaceId, targetDate],
    queryFn: async () => {
      const { data, error } = await q("assistant_daily_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("source", "daily-briefing")
        .eq("log_date", targetDate)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!workspaceId,
  });

  const { data: allDates = [] } = useQuery({
    queryKey: ["briefing-dates", workspaceId],
    queryFn: async () => {
      const { data } = await q("assistant_daily_logs")
        .select("log_date")
        .eq("workspace_id", workspaceId)
        .eq("source", "daily-briefing")
        .order("log_date", { ascending: false })
        .limit(30);
      const uniqueDates = [...new Set((data || []).map((d: any) => d.log_date))];
      return uniqueDates as string[];
    },
    enabled: !!workspaceId,
  });

  const { data: proposedTasks = [] } = useQuery({
    queryKey: ["briefing-tasks", workspaceId, targetDate],
    queryFn: async () => {
      const startOfDay = `${targetDate}T00:00:00`;
      const endOfDay = `${targetDate}T23:59:59`;
      const { data } = await q("ai_proposals")
        .select("id, title, status, confidence, proposed_changes")
        .eq("workspace_id", workspaceId)
        .eq("type", "assistant")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const handleDismiss = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedItems((prev) => new Set(prev).add(index));
    toast({ title: "Item dismissed", description: "This item has been hidden from this briefing." });
  }, [toast]);

  const handleConvertToTask = useCallback(async (text: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workspaceId) return;
    setCreatingTask(index);
    try {
      // Strip emoji prefix for clean task title
      const cleanText = text.replace(/^[🔴🟡🟢📊]\s*/, "").trim();
      const title = cleanText.length > 100 ? cleanText.slice(0, 100) + "…" : cleanText;

      const { error } = await q("tasks").insert({
        workspace_id: workspaceId,
        title,
        description: `Created from Daily Briefing (${targetDate}):\n\n${text}`,
        status: "todo",
        priority: classifyLine(text) === "urgent" ? "high" : "medium",
        space_id: "7be3aff1-1895-471b-8e39-8b2fc6b001f2",
      });
      if (error) throw error;
      toast({ title: "Task created", description: `"${title}" added to your tasks.` });
    } catch (err: any) {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    } finally {
      setCreatingTask(null);
    }
  }, [workspaceId, targetDate, toast]);

  const handleCardClick = useCallback((text: string) => {
    const route = inferRoute(text);
    if (route) navigate(route);
  }, [navigate]);

  const currentIdx = allDates.indexOf(targetDate);
  const prevDate = currentIdx >= 0 && currentIdx < allDates.length - 1 ? allDates[currentIdx + 1] : null;
  const nextDate = currentIdx > 0 ? allDates[currentIdx - 1] : null;

  const parsedLines = briefing?.content
    ? briefing.content
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0 && !l.startsWith("##") && !l.endsWith(":"))
    : [];

  const visibleLines = parsedLines.filter((_: string, i: number) => !dismissedItems.has(i));

  const urgentCount = visibleLines.filter((l: string) => l.startsWith("🔴")).length;
  const actionCount = visibleLines.filter((l: string) => l.startsWith("🟡")).length;
  const winCount = visibleLines.filter((l: string) => l.startsWith("🟢")).length;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-8 w-48 bg-muted/30 animate-pulse rounded" />
        <div className="h-[300px] bg-muted/30 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Daily Briefing</p>
            <h1 className="text-xl font-bold text-foreground">
              {safeFormat(targetDate + "T12:00:00", "EEEE, MMMM d, yyyy")}
            </h1>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary font-mono">
            <Sparkles className="w-3 h-3" />
            AI Generated
          </div>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2 ml-11">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevDate}
            onClick={() => prevDate && navigate(`/briefing/${prevDate}`)}
            className="h-7 text-xs"
          >
            <ChevronLeft className="w-3 h-3 mr-1" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextDate}
            onClick={() => nextDate && navigate(`/briefing/${nextDate}`)}
            className="h-7 text-xs"
          >
            Next <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
          {briefing && (
            <span className="text-[10px] text-muted-foreground ml-2">
              Generated {safeFormatDistanceToNow(briefing.created_at, { addSuffix: true })}
            </span>
          )}
        </div>
      </motion.div>

      {/* Summary badges */}
      {visibleLines.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {urgentCount > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
              🔴 {urgentCount} urgent
            </Badge>
          )}
          {actionCount > 0 && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
              🟡 {actionCount} action items
            </Badge>
          )}
          {winCount > 0 && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
              🟢 {winCount} wins
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {visibleLines.length} items total
          </Badge>
          {dismissedItems.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground"
              onClick={() => setDismissedItems(new Set())}
            >
              Show {dismissedItems.size} dismissed
            </Button>
          )}
        </div>
      )}

      {/* Briefing content */}
      {!briefing ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No briefing found for this date.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {parsedLines.map((line: string, i: number) => {
            if (dismissedItems.has(i)) return null;
            const type = classifyLine(line);
            const badge = typeBadge[type];
            const route = inferRoute(line);
            const showTaskBtn = canConvertToTask(type);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={cn(
                    "border-l-4 transition-colors group",
                    typeStyles[type],
                    route && "cursor-pointer hover:bg-muted/30"
                  )}
                  onClick={() => route && handleCardClick(line)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className={cn("text-[10px] shrink-0 mt-0.5", badge.className)}>
                        {badge.label}
                      </Badge>
                      <p className="text-sm text-foreground leading-relaxed flex-1">{line}</p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2 ml-[52px] opacity-0 group-hover:opacity-100 transition-opacity">
                      {showTaskBtn && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          disabled={creatingTask === i}
                          onClick={(e) => handleConvertToTask(line, i, e)}
                        >
                          <ListTodo className="w-3 h-3" />
                          {creatingTask === i ? "Creating…" : "Convert to Task"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDismiss(i, e)}
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </Button>
                      {route && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Click to view →
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Proposed action items from this briefing */}
      {proposedTasks.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
              Action Items Generated
            </h2>
            <div className="space-y-2">
              {proposedTasks.map((task: any) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/ai/proposals/${task.id}`)}
                >
                  <CardContent className="py-2.5 px-4 flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        task.status === "pending"
                          ? "bg-warning"
                          : task.status === "approved"
                          ? "bg-green-500"
                          : "bg-muted-foreground"
                      )}
                    />
                    <p className="text-sm flex-1 truncate">{task.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {task.status}
                    </Badge>
                    {task.confidence && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {Math.round(task.confidence * 100)}%
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Historical context */}
      {allDates.length > 1 && (
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
              Recent Briefings
            </h2>
            <div className="flex flex-wrap gap-2">
              {allDates.slice(0, 14).map((date) => (
                <Button
                  key={date}
                  variant={date === targetDate ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigate(`/briefing/${date}`)}
                >
                  {safeFormat(date + "T12:00:00", "MMM d")}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
