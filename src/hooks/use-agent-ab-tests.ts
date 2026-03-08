import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

const q = (table: string) => (supabase as any).from(table);

export interface AgentAbTest {
  id: string;
  workspace_id: string;
  name: string;
  agent_slug: string;
  variant_a_prompt: string;
  variant_a_model: string;
  variant_b_prompt: string;
  variant_b_model: string;
  test_input: string;
  variant_a_output: string | null;
  variant_b_output: string | null;
  winner: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export function useAgentAbTests() {
  const { workspaceId } = useWorkspace();
  return useQuery<AgentAbTest[]>({
    queryKey: ["agent-ab-tests", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await q("agent_ab_tests")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateAgentAbTest() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (test: Pick<AgentAbTest, "name" | "agent_slug" | "variant_a_prompt" | "variant_a_model" | "variant_b_prompt" | "variant_b_model" | "test_input">) => {
      if (!workspaceId) throw new Error("No workspace");
      const { error } = await q("agent_ab_tests").insert({ workspace_id: workspaceId, ...test });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("A/B test created"); qc.invalidateQueries({ queryKey: ["agent-ab-tests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunAgentAbTest() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (testId: string) => {
      if (!workspaceId) throw new Error("No workspace");
      // Get the test details
      const { data: test, error: fetchErr } = await q("agent_ab_tests").select("*").eq("id", testId).single();
      if (fetchErr) throw fetchErr;

      // Run both variants
      const [resultA, resultB] = await Promise.all([
        supabase.functions.invoke("agent-orchestrator", {
          body: { workspace_id: workspaceId, agent_slug: test.agent_slug, input: { message: test.test_input }, trigger_type: "manual", model: test.variant_a_model, system_prompt_override: test.variant_a_prompt || undefined },
        }),
        supabase.functions.invoke("agent-orchestrator", {
          body: { workspace_id: workspaceId, agent_slug: test.agent_slug, input: { message: test.test_input }, trigger_type: "manual", model: test.variant_b_model, system_prompt_override: test.variant_b_prompt || undefined },
        }),
      ]);

      const outputA = resultA.data?.response || resultA.error?.message || "No output";
      const outputB = resultB.data?.response || resultB.error?.message || "No output";

      await q("agent_ab_tests").update({
        variant_a_output: outputA,
        variant_b_output: outputB,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", testId);

      return { outputA, outputB };
    },
    onSuccess: () => { toast.success("A/B test completed"); qc.invalidateQueries({ queryKey: ["agent-ab-tests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePickAbTestWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, winner }: { testId: string; winner: "a" | "b" }) => {
      const { error } = await q("agent_ab_tests").update({ winner }).eq("id", testId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Winner selected"); qc.invalidateQueries({ queryKey: ["agent-ab-tests"] }); },
  });
}
