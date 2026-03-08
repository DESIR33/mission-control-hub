import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Terminal, Play, Loader2 } from "lucide-react";
import { useAgents, useRunAgent } from "@/hooks/use-agents";

export function PromptPlayground() {
  const { data: agents = [] } = useAgents();
  const runAgent = useRunAgent();
  const [selectedAgent, setSelectedAgent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<string | null>(null);

  const handleRun = async () => {
    if (!selectedAgent || !prompt) return;
    setOutput(null);
    try {
      const result = await runAgent.mutateAsync({ agent_slug: selectedAgent, message: prompt });
      setOutput(result.response);
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          Prompt Playground
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Agent</Label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
            <SelectContent>{agents.map((a) => <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Input Prompt</Label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Test your prompt here..." rows={4} />
        </div>
        <Button onClick={handleRun} disabled={runAgent.isPending || !selectedAgent || !prompt} className="w-full">
          {runAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          Run
        </Button>
        {output && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-64 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-1">Output:</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{output}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
