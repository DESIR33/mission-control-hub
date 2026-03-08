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
import { Zap, Plus, Trash2, Loader2 } from "lucide-react";
import { useAgentTriggers, useCreateTrigger, useDeleteTrigger, useToggleTrigger } from "@/hooks/use-agent-triggers";
import { useAgents } from "@/hooks/use-agents";

export function NaturalLanguageTriggers() {
  const { data: triggers = [], isLoading } = useAgentTriggers();
  const { data: agents = [] } = useAgents();
  const createTrigger = useCreateTrigger();
  const deleteTrigger = useDeleteTrigger();
  const toggleTrigger = useToggleTrigger();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [rule, setRule] = useState("");
  const [agentSlug, setAgentSlug] = useState("");

  const handleCreate = () => {
    if (!name.trim() || !rule.trim() || !agentSlug) return;
    createTrigger.mutate({ name, natural_language_rule: rule, agent_slug: agentSlug }, {
      onSuccess: () => { setShowCreate(false); setName(""); setRule(""); setAgentSlug(""); },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Smart Triggers
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Trigger
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : triggers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No triggers yet. Describe conditions in plain English to auto-run agents.</p>
        ) : (
          triggers.map((t) => (
            <div key={t.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{t.trigger_count} runs</Badge>
                  <Switch checked={t.enabled} onCheckedChange={(v) => toggleTrigger.mutate({ id: t.id, enabled: v })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTrigger.mutate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">"{t.natural_language_rule}"</p>
              <p className="text-xs text-muted-foreground mt-1">Agent: <span className="text-foreground">{t.agent_slug}</span></p>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Create Smart Trigger</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Low CTR Alert" /></div>
            <div>
              <Label>Condition (plain English)</Label>
              <Textarea value={rule} onChange={(e) => setRule(e.target.value)} placeholder='e.g. "When any video drops below 3% CTR within 48 hours of publishing"' rows={3} />
            </div>
            <div>
              <Label>Agent to run</Label>
              <Select value={agentSlug} onValueChange={setAgentSlug}>
                <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                <SelectContent>
                  {agents.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTrigger.isPending || !name.trim() || !rule.trim()}>
              {createTrigger.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
