import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import {
  GitGraph, Plus, Trash2, ArrowRight, Play, Loader2, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const AGENTS = ["competitor-analyst", "content-strategist", "growth-optimizer", "audience-analyst", "revenue-optimizer"];

export function MultiAgentWorkflows() {
  const { workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<{ agent_slug: string; condition: string }[]>([
    { agent_slug: AGENTS[0], condition: "" },
  ]);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["multi-agent-workflows", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: wfs } = await (supabase as any).from("agent_workflows").select("*, agent_workflow_steps(*)").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
      return wfs || [];
    },
    enabled: !!workspaceId,
  });

  const createWorkflow = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !name) throw new Error("Name required");
      const { data: wf, error } = await (supabase as any).from("agent_workflows").insert({
        workspace_id: workspaceId, name, description: description || null, enabled: true,
      }).select().single();
      if (error) throw error;

      for (let i = 0; i < steps.length; i++) {
        await (supabase as any).from("agent_workflow_steps").insert({
          workflow_id: wf.id, agent_slug: steps[i].agent_slug, step_order: i,
          condition: steps[i].condition ? { rule: steps[i].condition } : {},
        });
      }
    },
    onSuccess: () => {
      toast.success("Workflow created");
      qc.invalidateQueries({ queryKey: ["multi-agent-workflows"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      setSteps([{ agent_slug: AGENTS[0], condition: "" }]);
    },
  });

  const addStep = () => setSteps([...steps, { agent_slug: AGENTS[0], condition: "" }]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: string, value: string) => {
    const updated = [...steps];
    (updated[i] as any)[field] = value;
    setSteps(updated);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <GitGraph className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Multi-Agent Workflows</h3>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {showCreate && (
        <div className="p-4 border-b border-border space-y-3">
          <Input placeholder="Workflow name" value={name} onChange={e => setName(e.target.value)} className="text-sm" />
          <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="text-sm min-h-[40px]" />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Steps (executed in order):</p>
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">Step {i + 1}</Badge>
                <Select value={step.agent_slug} onValueChange={v => updateStep(i, "agent_slug", v)}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGENTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Condition (optional)" value={step.condition} onChange={e => updateStep(i, "condition", e.target.value)} className="text-xs h-7 flex-1" />
                {steps.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeStep(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addStep}>
              <Plus className="w-3 h-3 mr-1" /> Add Step
            </Button>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createWorkflow.mutate()} disabled={createWorkflow.isPending || !name}>
              {createWorkflow.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Create Workflow
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No workflows yet. Chain agents together for automated pipelines.</p>
        ) : (
          workflows.map((wf: any) => (
            <div key={wf.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{wf.name}</p>
                <Badge variant={wf.enabled ? "default" : "secondary"} className="text-[10px]">
                  {wf.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              {wf.description && <p className="text-xs text-muted-foreground">{wf.description}</p>}
              <div className="flex items-center gap-1 flex-wrap">
                {(wf.agent_workflow_steps || [])
                  .sort((a: any, b: any) => a.step_order - b.step_order)
                  .map((step: any, i: number) => (
                    <div key={step.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{step.agent_slug}</Badge>
                      {i < (wf.agent_workflow_steps?.length || 0) - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
