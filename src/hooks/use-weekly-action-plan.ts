import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { startOfWeek, format } from "date-fns";

export interface ActionItem {
  id: string;
  type: "topic" | "schedule" | "double_down" | "experiment";
  title: string;
  description: string;
  status: "new" | "accepted" | "dismissed";
}

export interface WeeklyPlan {
  id: string;
  weekOf: string;
  topics: ActionItem[];
  schedule: ActionItem[];
  doubleDown: ActionItem[];
  experiments: ActionItem[];
  allItems: ActionItem[];
  source: string;
}

function parseItemsFromContent(content: any, planId: string): WeeklyPlan {
  const weekOf = content?.week_of ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const makeItems = (
    items: any[] | undefined,
    type: ActionItem["type"],
    prefix: string
  ): ActionItem[] =>
    (items ?? []).map((item: any, i: number) => ({
      id: `${planId}-${prefix}-${i}`,
      type,
      title: typeof item === "string" ? item : item.title ?? item.name ?? `Item ${i + 1}`,
      description: typeof item === "string" ? "" : item.description ?? item.reason ?? "",
      status: (item.status as ActionItem["status"]) ?? "new",
    }));

  const topics = makeItems(content?.topics ?? content?.top_video_topics, "topic", "topic");
  const schedule = makeItems(content?.schedule ?? content?.posting_schedule, "schedule", "sched");
  const doubleDown = makeItems(
    content?.double_down ? [content.double_down] : content?.double_downs,
    "double_down",
    "dd"
  );
  const experiments = makeItems(
    content?.experiment ? [content.experiment] : content?.experiments,
    "experiment",
    "exp"
  );

  return {
    id: planId,
    weekOf,
    topics,
    schedule,
    doubleDown,
    experiments,
    allItems: [...topics, ...schedule, ...doubleDown, ...experiments],
    source: content?.source ?? "weekly_plan",
  };
}

export function useWeeklyActionPlan() {
  const { workspaceId } = useWorkspace();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Fetch latest assistant_daily_logs where source = 'weekly_plan'
  const { data: dailyLog, isLoading: logLoading } = useQuery({
    queryKey: ["weekly-plan-log", workspaceId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_daily_logs" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("source", "weekly_plan")
        .gte("created_at", weekStart)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] as any | undefined;
    },
    enabled: !!workspaceId,
  });

  // Fallback: fetch strategist_daily_runs
  const { data: strategistRun, isLoading: stratLoading } = useQuery({
    queryKey: ["weekly-plan-strategist", workspaceId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategist_daily_runs" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .gte("created_at", weekStart)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] as any | undefined;
    },
    enabled: !!workspaceId && !dailyLog,
  });

  // Fetch top performing categories for context
  const { data: topCategories = [] } = useQuery({
    queryKey: ["weekly-plan-top-categories", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("title, views")
        .eq("workspace_id", workspaceId!)
        .order("views", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({ category: d.title ?? "Unknown", views: d.views ?? 0, engagement_rate: 0 })) as Array<{ category: string; views: number; engagement_rate: number }>;
    },
    enabled: !!workspaceId,
  });

  const plan = useMemo((): WeeklyPlan | null => {
    const source = dailyLog ?? strategistRun;
    if (!source) return null;

    let content: any;
    try {
      content = typeof source.content === "string" ? JSON.parse(source.content) : source.content;
    } catch {
      // Try output field for strategist runs
      try {
        content = typeof source.output === "string" ? JSON.parse(source.output) : source.output;
      } catch {
        return null;
      }
    }

    if (!content) return null;
    return parseItemsFromContent(content, source.id);
  }, [dailyLog, strategistRun]);

  return {
    plan,
    isLoading: logLoading || stratLoading,
    topCategories,
  };
}

export function useGenerateWeeklyPlan() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("daily-briefing", {
        body: { workspace_id: workspaceId, type: "weekly_plan" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Weekly plan generated!");
      qc.invalidateQueries({ queryKey: ["weekly-plan-log"] });
      qc.invalidateQueries({ queryKey: ["weekly-plan-strategist"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to generate plan: ${err.message}`);
    },
  });
}

export function useUpdateActionItem() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      action,
    }: {
      itemId: string;
      action: "accepted" | "dismissed";
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await supabase
        .from("assistant_memory" as any)
        .insert({
          workspace_id: workspaceId,
          memory_type: "action_item_decision",
          key: itemId,
          value: JSON.stringify({ action, decided_at: new Date().toISOString() }),
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "accepted" ? "Action item accepted" : "Action item dismissed"
      );
      qc.invalidateQueries({ queryKey: ["weekly-plan-log"] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });
}
