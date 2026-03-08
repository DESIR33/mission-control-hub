import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FlaskConical, Play, Trophy, Loader2 } from "lucide-react";
import { useAgentAbTests, useCreateAgentAbTest, useRunAgentAbTest, usePickAbTestWinner } from "@/hooks/use-agent-ab-tests";
import { useAgents } from "@/hooks/use-agents";

export function AgentAbTesting() {
  const { data: tests = [] } = useAgentAbTests();
  const { data: agents = [] } = useAgents();
  const createTest = useCreateAgentAbTest();
  const runTest = useRunAgentAbTest();
  const pickWinner = usePickAbTestWinner();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", agent_slug: "", variant_a_prompt: "", variant_a_model: "minimax/minimax-m2.5", variant_b_prompt: "", variant_b_model: "minimax/minimax-m2.5", test_input: "" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Agent A/B Testing
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>New Test</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tests.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No A/B tests yet. Create one to compare agent prompts or models.</p>}
        {tests.map((test) => (
          <div key={test.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{test.name}</span>
              <Badge variant={test.status === "completed" ? "default" : "secondary"} className="text-xs">{test.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Agent: {test.agent_slug} | Input: {test.test_input.slice(0, 60)}...</p>
            {test.status === "pending" && (
              <Button size="sm" onClick={() => runTest.mutate(test.id)} disabled={runTest.isPending}>
                {runTest.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                Run Test
              </Button>
            )}
            {test.status === "completed" && (
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-md border p-2 text-xs ${test.winner === "a" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <p className="font-medium mb-1">Variant A ({test.variant_a_model.split("/").pop()})</p>
                  <p className="text-muted-foreground line-clamp-3">{test.variant_a_output}</p>
                  {!test.winner && <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => pickWinner.mutate({ testId: test.id, winner: "a" })}><Trophy className="h-3 w-3 mr-1" /> Pick A</Button>}
                </div>
                <div className={`rounded-md border p-2 text-xs ${test.winner === "b" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <p className="font-medium mb-1">Variant B ({test.variant_b_model.split("/").pop()})</p>
                  <p className="text-muted-foreground line-clamp-3">{test.variant_b_output}</p>
                  {!test.winner && <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => pickWinner.mutate({ testId: test.id, winner: "b" })}><Trophy className="h-3 w-3 mr-1" /> Pick B</Button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Agent A/B Test</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Test Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="E.g. Better outreach prompt" /></div>
            <div>
              <Label>Agent</Label>
              <Select value={form.agent_slug} onValueChange={(v) => setForm({ ...form, agent_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>{agents.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Test Input</Label><Textarea value={form.test_input} onChange={(e) => setForm({ ...form, test_input: e.target.value })} placeholder="Message to send to both variants" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Variant A Prompt</Label><Textarea value={form.variant_a_prompt} onChange={(e) => setForm({ ...form, variant_a_prompt: e.target.value })} rows={3} placeholder="System prompt override (or leave empty for default)" /></div>
              <div><Label>Variant B Prompt</Label><Textarea value={form.variant_b_prompt} onChange={(e) => setForm({ ...form, variant_b_prompt: e.target.value })} rows={3} placeholder="Alternative prompt" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => { createTest.mutate(form); setShowCreate(false); }} disabled={!form.name || !form.agent_slug || !form.test_input}>Create Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
