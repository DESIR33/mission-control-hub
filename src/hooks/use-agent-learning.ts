import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const query = (table: string) => (supabase as any).from(table);

export interface AgentLearningPreference {
  id: string;
  workspace_id: string;
  agent_slug: string;
  preference_type: string;
  preference_value: string;
  weight: number;
  learned_from_count: number;
  created_at: string;
  updated_at: string;
}

export function useAgentLearningPreferences(agentSlug?: string) {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentLearningPreference[]>({
    queryKey: ["agent-learning", workspaceId, agentSlug],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = query("agent_learning_preferences")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("weight", { ascending: false });
      if (agentSlug) q = q.eq("agent_slug", agentSlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AgentLearningPreference[];
    },
    enabled: !!workspaceId,
  });
}

export function useRecordAgentPreference() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pref: {
      agent_slug: string;
      preference_type: string;
      preference_value: string;
      weight_delta: number; // positive = liked, negative = disliked
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      // Upsert: increment weight and count
      const { data: existing } = await query("agent_learning_preferences")
        .select("id, weight, learned_from_count")
        .eq("workspace_id", workspaceId)
        .eq("agent_slug", pref.agent_slug)
        .eq("preference_type", pref.preference_type)
        .eq("preference_value", pref.preference_value)
        .maybeSingle();

      if (existing) {
        const { error } = await query("agent_learning_preferences")
          .update({
            weight: existing.weight + pref.weight_delta,
            learned_from_count: existing.learned_from_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await query("agent_learning_preferences").insert({
          workspace_id: workspaceId,
          agent_slug: pref.agent_slug,
          preference_type: pref.preference_type,
          preference_value: pref.preference_value,
          weight: pref.weight_delta,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-learning"] });
    },
  });
}

/** Build a preference summary string for inclusion in agent system prompts */
export function useAgentPreferenceSummary(agentSlug?: string): string {
  const { data: prefs = [] } = useAgentLearningPreferences(agentSlug);
  if (!prefs.length) return "";

  const liked = prefs.filter((p) => p.weight > 0).slice(0, 10);
  const disliked = prefs.filter((p) => p.weight < 0).slice(0, 10);

  const lines: string[] = ["## User Preferences (learned from feedback):"];
  if (liked.length) {
    lines.push("**Preferred:** " + liked.map((p) => `${p.preference_value} (${p.preference_type})`).join(", "));
  }
  if (disliked.length) {
    lines.push("**Avoid:** " + disliked.map((p) => `${p.preference_value} (${p.preference_type})`).join(", "));
  }
  return lines.join("\n");
}
