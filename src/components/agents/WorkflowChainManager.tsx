import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GitBranch, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { useAgentWorkflows, useCreateWorkflow, useDeleteWorkflow, useToggleWorkflow } from "@/hooks/use-agent-workflows";
import { useAgents } from "@/hooks/use-agents";

export function WorkflowChainManager() {
  const { data: workflows = [], isLoading } = useAgentWorkflows();
  const { data: agents = [] } = useAgents();
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const toggleWorkflow = useToggleWorkflow();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<{ agent_slug: string; skill_slug?: string }[]>([{ agent_slug: "" }]);

  const handleCreate = () => {
    if (!name.trim() || steps.some(s => !s.agent_slug)) return;
    createWorkflow.mutate({ name, description, steps }, {
      onSuccess: () => { setShowCreate(false); setName(""); setDescription(""); setSteps([{ agent_slug: "" }]); },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Agent Workflows
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Chain
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No workflows yet. Create a chain to automate agent sequences.</p>
        ) : (
          workflows.map((wf) => (
            <div key={wf.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{wf.name}</p>
                  {wf.description && <p className="text-xs text-muted-foreground">{wf.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={wf.enabled} onCheckedChange={(v) => toggleWorkflow.mutate({ id: wf.id, enabled: v })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteWorkflow.mutate(wf.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {(wf.steps ?? []).map((step, i) => (
                  <div key={step.id} className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">{step.agent_slug}</Badge>
                    {i < (wf.steps?.length ?? 0) - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Create Agent Chain</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trend → Content → Schedule" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this chain do?" rows={2} /></div>
            <div>
              <Label>Steps (in order)</Label>
              <div className="space-y-2 mt-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <Select value={step.agent_slug} onValueChange={(v) => { const s = [...steps]; s[i] = { ...s[i], agent_slug: v }; setSteps(s); }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select agent..." /></SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {steps.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setSteps([...steps, { agent_slug: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createWorkflow.isPending || !name.trim()}>
              {createWorkflow.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Chain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
