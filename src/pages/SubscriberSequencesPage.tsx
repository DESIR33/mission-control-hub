import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriberSequences, useCreateSubscriberSequence, useDeleteSubscriberSequence } from "@/hooks/use-subscriber-sequences";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Trash2, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriberSequenceStep, SubscriberSequenceTrigger } from "@/types/subscriber";

export default function SubscriberSequencesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [triggerType, setTriggerType] = useState<SubscriberSequenceTrigger>("manual");
  const [steps, setSteps] = useState<SubscriberSequenceStep[]>([
    { step_number: 1, delay_days: 0, subject: "", body: "" },
  ]);

  const { data: sequences = [], isLoading } = useSubscriberSequences();
  const createSequence = useCreateSubscriberSequence();
  const deleteSequence = useDeleteSubscriberSequence();
  const { toast } = useToast();

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { step_number: prev.length + 1, delay_days: prev.length * 2, subject: "", body: "" },
    ]);
  };

  const updateStep = (index: number, field: keyof SubscriberSequenceStep, value: string | number) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createSequence.mutateAsync({
        name: form.get("name") as string,
        description: (form.get("description") as string) || undefined,
        trigger_type: triggerType,
        steps,
      });
      toast({ title: "Sequence created" });
      setDialogOpen(false);
      setSteps([{ step_number: 1, delay_days: 0, subject: "", body: "" }]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSequence.mutateAsync(id);
      toast({ title: "Sequence deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const triggerLabels: Record<SubscriberSequenceTrigger, string> = {
    manual: "Manual",
    on_subscribe: "On Subscribe",
    on_guide_download: "On Guide Download",
    on_tag: "On Tag Added",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriber Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated email drip campaigns for your subscribers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              New Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sequence</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="seq_name">Name *</Label>
                <Input id="seq_name" name="name" required placeholder="Welcome Series" className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seq_desc">Description</Label>
                <Textarea id="seq_desc" name="description" rows={2} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label>Trigger</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as SubscriberSequenceTrigger)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Enrollment</SelectItem>
                    <SelectItem value="on_subscribe">On Subscribe</SelectItem>
                    <SelectItem value="on_guide_download">On Guide Download</SelectItem>
                    <SelectItem value="on_tag">On Tag Added</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
                    <Plus className="w-3 h-3" />
                    Add Step
                  </Button>
                </div>
                {steps.map((step, idx) => (
                  <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Step {step.step_number}</span>
                      {steps.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeStep(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Delay (days)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={step.delay_days}
                        onChange={(e) => updateStep(idx, "delay_days", parseInt(e.target.value) || 0)}
                        className="h-7 text-sm bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Subject</Label>
                      <Input
                        value={step.subject}
                        onChange={(e) => updateStep(idx, "subject", e.target.value)}
                        placeholder="Welcome to the community!"
                        className="h-7 text-sm bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Body</Label>
                      <Textarea
                        value={step.body}
                        onChange={(e) => updateStep(idx, "body", e.target.value)}
                        rows={3}
                        placeholder="Hi {{first_name}}, ..."
                        className="text-sm bg-secondary border-border"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createSequence.isPending}>
                  {createSequence.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Sequence
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : sequences.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No sequences yet. Create one to automate subscriber emails.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sequences.map((seq) => (
            <Card key={seq.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{seq.name}</CardTitle>
                    {seq.description && <p className="text-xs text-muted-foreground mt-1">{seq.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(seq.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", seq.status === "active" ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground")}>
                    {seq.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {triggerLabels[seq.trigger_type]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {seq.steps.slice(0, 3).map((step) => (
                    <div key={step.step_number} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span>Day {step.delay_days}:</span>
                      <span className="text-foreground truncate">{step.subject || "(no subject)"}</span>
                    </div>
                  ))}
                  {seq.steps.length > 3 && (
                    <p className="text-xs text-muted-foreground ml-5">+{seq.steps.length - 3} more steps</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
