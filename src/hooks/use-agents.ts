import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getGatedFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";
import type {
  AgentDefinition,
  AgentSkill,
  AgentExecution,
  AgentRunResult,
  ProactiveRunResult,
} from "@/types/agents";

const query = (table: string) => (supabase as any).from(table);

// ── Agent Definitions ────────────────────────────────────────

export function useAgents() {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentDefinition[]>({
    queryKey: ["agents", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("agent_definitions")
        .select("id,slug,name,description,model,system_prompt,skills,config,enabled,is_system,workspace_id,created_at,updated_at")
        .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
        .eq("enabled", true)
        .order("name");
      if (error) throw error;
      return (data as AgentDefinition[]) || [];
    },
    enabled: !!workspaceId,
    ...getFreshness("agentExecutions"),
  });
}

export function useToggleAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await query("agent_definitions")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

// ── Agent Skills ─────────────────────────────────────────────

export function useSkills() {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentSkill[]>({
    queryKey: ["agent-skills", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("agent_skills")
        .select("id,slug,name,description,category,skill_type,input_schema,tool_definitions,enabled,is_system,workspace_id,created_at,updated_at")
        .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
        .eq("enabled", true)
        .order("category, name");
      if (error) throw error;
      return (data as AgentSkill[]) || [];
    },
    enabled: !!workspaceId,
    ...getFreshness("agentExecutions"),
  });
}

export function useCreateSkill() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (skill: {
      name: string;
      slug: string;
      description: string;
      category: AgentSkill["category"];
      input_schema?: Record<string, unknown>;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await query("agent_skills").insert({
        workspace_id: workspaceId,
        name: skill.name,
        slug: skill.slug,
        description: skill.description,
        category: skill.category,
        skill_type: "custom",
        input_schema: skill.input_schema || {},
        tool_definitions: [
          {
            type: "function",
            function: {
              name: skill.slug,
              description: skill.description,
              parameters: {
                type: "object",
                properties: skill.input_schema || {},
                required: [],
              },
            },
          },
        ],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await query("agent_skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
    },
  });
}

// ── Agent Executions ─────────────────────────────────────────

export function useExecutions(limit = 20) {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentExecution[]>({
    queryKey: ["agent-executions", workspaceId, limit],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("agent_executions")
        .select("id, workspace_id, agent_slug, agent_id, skill_slug, status, trigger_type, input, output, error_message, proposals_created, started_at, completed_at, duration_ms, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as AgentExecution[]) || [];
    },
    enabled: !!workspaceId,
    ...getFreshness("agentExecutions"),
  });
}

export function useAgentExecutions(agentSlug: string, limit = 10) {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentExecution[]>({
    queryKey: ["agent-executions", workspaceId, agentSlug, limit],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await query("agent_executions")
        .select("id, workspace_id, agent_slug, agent_id, skill_slug, status, trigger_type, input, output, error_message, proposals_created, started_at, completed_at, duration_ms, created_at")
        .eq("workspace_id", workspaceId)
        .eq("agent_slug", agentSlug)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as AgentExecution[]) || [];
    },
    enabled: !!workspaceId,
  });
}

// ── Run Agent ────────────────────────────────────────────────

export function useRunAgent() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation<AgentRunResult, Error, { agent_slug: string; message: string; model?: string }>({
    mutationFn: async ({ agent_slug, message, model }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "agent-orchestrator",
        {
          body: {
            workspace_id: workspaceId,
            agent_slug,
            input: { message },
            trigger_type: "manual",
            model,
          },
        }
      );
      if (error) throw error;
      return data as AgentRunResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-executions"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}

export function useRunVideoOptimizer() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; videos_analyzed: number; proposals_created: number; results: any[] },
    Error,
    { max_videos?: number; model?: string; video_id?: string }
  >({
    mutationFn: async ({ max_videos = 10, model, video_id }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("video-optimizer-agent", {
        body: { workspace_id: workspaceId, max_videos, model, video_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-executions"] });
      queryClient.invalidateQueries({ queryKey: ["ai_proposals"] });
      queryClient.invalidateQueries({ queryKey: ["video-proposals"] });
    },
  });
}

export function useRunAllAgents() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation<ProactiveRunResult, Error, { agent_slugs?: string[] }>({
    mutationFn: async ({ agent_slugs }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke(
        "agent-proactive-runner",
        {
          body: {
            workspace_id: workspaceId,
            agent_slugs,
          },
        }
      );
      if (error) throw error;
      return data as ProactiveRunResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-executions"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}
