import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { GitBranch, ArrowRight, Plus } from "lucide-react";
import { useCollaborationThreads, useCreateCollaborationThread } from "@/hooks/use-collaboration-threads";
import { useAgents } from "@/hooks/use-agents";
import { AGENT_COLORS } from "@/types/agents";

export function AgentCollaborationThreads() {
  const { data: threads = [] } = useCollaborationThreads();
  const { data: agents = [] } = useAgents();
  const createThread = useCreateCollaborationThread();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", initial_agent: "", message: "" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Agent Collaboration
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" /> New Thread</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {threads.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No collaboration threads. Start one to chain agents.</p>}
        {threads.map((thread) => (
          <div key={thread.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{thread.title}</span>
              <Badge variant="secondary" className="text-xs">{thread.status}</Badge>
            </div>
            <div className="space-y-1.5">
              {(thread.messages ?? []).map((msg, i) => (
                <div key={msg.id} className="flex items-start gap-2">
                  <Badge variant="outline" className={`text-xs shrink-0 ${AGENT_COLORS[msg.agent_slug] || "text-foreground"}`}>
                    {msg.agent_slug}
                  </Badge>
                  <p className="text-xs text-muted-foreground flex-1">{msg.content.slice(0, 120)}{msg.content.length > 120 ? "..." : ""}</p>
                  {msg.handoff_to && (
                    <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                      <ArrowRight className="h-3 w-3" /> {msg.handoff_to}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Collaboration Thread</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="E.g. Q2 Content Strategy" /></div>
            <div>
              <Label>Starting Agent</Label>
              <Select value={form.initial_agent} onValueChange={(v) => setForm({ ...form, initial_agent: v })}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>{agents.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Initial Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="What should the agent start with?" rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => { createThread.mutate(form); setShowCreate(false); }} disabled={!form.title || !form.initial_agent || !form.message}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
