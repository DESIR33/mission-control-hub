import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useReengagementABTests, useCreateReengagementABTest } from "@/hooks/use-subscriber-churn";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FlaskConical, Plus, Loader2, Trophy } from "lucide-react";

export function ReengagementABTestPanel() {
  const { data: tests = [], isLoading } = useReengagementABTests();
  const createTest = useCreateReengagementABTest();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createTest.mutateAsync({
        name: fd.get("name") as string,
        variant_a_subject: fd.get("variant_a") as string,
        variant_b_subject: fd.get("variant_b") as string,
      });
      toast({ title: "A/B test created" });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-muted-foreground" />
            Re-engagement A/B Tests
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1"><Plus className="w-3 h-3" /> New Test</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Create A/B Test</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Test Name *</Label>
                  <Input name="name" required placeholder="Win-back test #1" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Variant A Subject *</Label>
                  <Input name="variant_a" required placeholder="We miss you! Here's what you missed" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Variant B Subject *</Label>
                  <Input name="variant_b" required placeholder="Your exclusive content is waiting" className="bg-secondary border-border" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createTest.isPending}>
                    {createTest.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No A/B tests yet</p>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => {
              const aRate = test.variant_a_sent > 0 ? Math.round((test.variant_a_opened / test.variant_a_sent) * 100) : 0;
              const bRate = test.variant_b_sent > 0 ? Math.round((test.variant_b_opened / test.variant_b_sent) * 100) : 0;
              return (
                <div key={test.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{test.name}</span>
                    <Badge variant="outline" className={cn("text-xs",
                      test.status === "running" ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground"
                    )}>
                      {test.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn("rounded p-2 text-xs space-y-1", test.winner === "a" ? "bg-success/10 border border-success/30" : "bg-muted/50")}>
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        {test.winner === "a" && <Trophy className="w-3 h-3 text-success" />}
                        Variant A
                      </div>
                      <p className="text-muted-foreground truncate">{test.variant_a_subject}</p>
                      <p className="font-mono">{aRate}% open ({test.variant_a_opened}/{test.variant_a_sent})</p>
                    </div>
                    <div className={cn("rounded p-2 text-xs space-y-1", test.winner === "b" ? "bg-success/10 border border-success/30" : "bg-muted/50")}>
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        {test.winner === "b" && <Trophy className="w-3 h-3 text-success" />}
                        Variant B
                      </div>
                      <p className="text-muted-foreground truncate">{test.variant_b_subject}</p>
                      <p className="font-mono">{bRate}% open ({test.variant_b_opened}/{test.variant_b_sent})</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
