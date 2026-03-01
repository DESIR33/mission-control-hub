import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface StageHistoryEntry {
  id: string;
  workspace_id: string;
  deal_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_at: string;
  changed_by: string | null;
}

export interface StageVelocity {
  stage: string;
  avgDays: number;
  dealCount: number;
}

export interface PipelineVelocityData {
  stageVelocities: StageVelocity[];
  avgCycleTime: number;
  stageConversions: Array<{ from: string; to: string; rate: number }>;
  bottleneck: string | null;
}

export function useDealStageHistory(dealId?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["deal-stage-history", workspaceId, dealId],
    queryFn: async (): Promise<StageHistoryEntry[]> => {
      let query = supabase
        .from("deal_stage_history" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("changed_at", { ascending: true });
      if (dealId) query = query.eq("deal_id", dealId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as StageHistoryEntry[];
    },
    enabled: !!workspaceId,
  });
}

const STAGE_ORDER = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"];

export function useDealVelocity() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["deal-velocity", workspaceId],
    queryFn: async (): Promise<PipelineVelocityData> => {
      const { data, error } = await supabase
        .from("deal_stage_history" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("changed_at", { ascending: true });
      if (error) throw error;

      const history = (data ?? []) as unknown as StageHistoryEntry[];

      // Group by deal
      const byDeal: Record<string, StageHistoryEntry[]> = {};
      for (const h of history) {
        if (!byDeal[h.deal_id]) byDeal[h.deal_id] = [];
        byDeal[h.deal_id].push(h);
      }

      // Calculate time in each stage
      const stageDurations: Record<string, number[]> = {};
      const stageTransitions: Record<string, number> = {};
      let totalCycleTimes: number[] = [];

      for (const [, entries] of Object.entries(byDeal)) {
        const sorted = entries.sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

        for (let i = 0; i < sorted.length; i++) {
          const from = sorted[i].from_stage;
          const to = sorted[i].to_stage;
          if (from) {
            const key = `${from}->${to}`;
            stageTransitions[key] = (stageTransitions[key] ?? 0) + 1;
          }

          if (from && i > 0) {
            const prevTime = new Date(sorted[i - 1].changed_at).getTime();
            const curTime = new Date(sorted[i].changed_at).getTime();
            const days = (curTime - prevTime) / (1000 * 60 * 60 * 24);
            if (!stageDurations[from]) stageDurations[from] = [];
            stageDurations[from].push(days);
          }
        }

        // Total cycle time for closed deals
        const lastEntry = sorted[sorted.length - 1];
        if (lastEntry.to_stage === "closed_won" || lastEntry.to_stage === "closed_lost") {
          const first = new Date(sorted[0].changed_at).getTime();
          const last = new Date(lastEntry.changed_at).getTime();
          totalCycleTimes.push((last - first) / (1000 * 60 * 60 * 24));
        }
      }

      const stageVelocities: StageVelocity[] = STAGE_ORDER
        .filter((s) => stageDurations[s] && stageDurations[s].length > 0)
        .map((stage) => ({
          stage,
          avgDays: Math.round((stageDurations[stage].reduce((a, b) => a + b, 0) / stageDurations[stage].length) * 10) / 10,
          dealCount: stageDurations[stage].length,
        }));

      const avgCycleTime = totalCycleTimes.length > 0
        ? Math.round((totalCycleTimes.reduce((a, b) => a + b, 0) / totalCycleTimes.length) * 10) / 10
        : 0;

      const bottleneck = stageVelocities.length > 0
        ? stageVelocities.reduce((max, s) => (s.avgDays > max.avgDays ? s : max)).stage
        : null;

      // Stage conversion rates
      const stageConversions: Array<{ from: string; to: string; rate: number }> = [];
      for (let i = 0; i < STAGE_ORDER.length - 2; i++) {
        const from = STAGE_ORDER[i];
        const to = STAGE_ORDER[i + 1];
        const key = `${from}->${to}`;
        const total = Object.values(stageTransitions).filter((_, idx) =>
          Object.keys(stageTransitions)[idx].startsWith(`${from}->`)
        ).reduce((a, b) => a + b, 0);
        const advanced = stageTransitions[key] ?? 0;
        stageConversions.push({
          from,
          to,
          rate: total > 0 ? Math.round((advanced / total) * 100) : 0,
        });
      }

      return { stageVelocities, avgCycleTime, stageConversions, bottleneck };
    },
    enabled: !!workspaceId,
  });
}
