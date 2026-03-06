import { useState } from "react";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CompetitorBenchmark } from "../CompetitorBenchmark";
import { CompetitorIntelligence } from "../CompetitorIntelligence";
import { CompetitorActivityFeed } from "../CompetitorActivityFeed";
import { CompetitorWarRoom } from "../CompetitorWarRoom";
import { useCreateCompetitor } from "@/hooks/use-competitor-benchmarking";
import { toast } from "sonner";

const emptyForm = {
  channel_name: "",
  channel_url: "",
  subscriber_count: "",
  video_count: "",
  total_view_count: "",
  primary_niche: "",
};

export function CompetitorIntelSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const createCompetitor = useCreateCompetitor();

  const handleAdd = () => {
    if (!form.channel_name.trim()) {
      toast.error("Channel name is required");
      return;
    }
    createCompetitor.mutate(
      {
        channel_name: form.channel_name.trim(),
        channel_url: form.channel_url || null,
        subscriber_count: form.subscriber_count ? Number(form.subscriber_count) : null,
        video_count: form.video_count ? Number(form.video_count) : null,
        total_view_count: form.total_view_count ? Number(form.total_view_count) : null,
        primary_niche: form.primary_niche || null,
      },
      {
        onSuccess: () => {
          setForm(emptyForm);
          setDialogOpen(false);
          toast.success("Competitor added");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Competitor Intel</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Competitor
        </Button>
      </div>

      <Tabs defaultValue="benchmark" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
          <TabsTrigger value="intel">Deep Intel</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="warroom">War Room</TabsTrigger>
        </TabsList>
        <TabsContent value="benchmark"><CompetitorBenchmark /></TabsContent>
        <TabsContent value="intel"><CompetitorIntelligence /></TabsContent>
        <TabsContent value="activity"><CompetitorActivityFeed /></TabsContent>
        <TabsContent value="warroom"><CompetitorWarRoom /></TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border col-span-2"
                placeholder="Channel name *"
                value={form.channel_name}
                onChange={(e) => setForm({ ...form, channel_name: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border col-span-2"
                placeholder="Channel URL"
                value={form.channel_url}
                onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Subscribers"
                type="number"
                value={form.subscriber_count}
                onChange={(e) => setForm({ ...form, subscriber_count: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Video count"
                type="number"
                value={form.video_count}
                onChange={(e) => setForm({ ...form, video_count: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Total views"
                type="number"
                value={form.total_view_count}
                onChange={(e) => setForm({ ...form, total_view_count: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Niche"
                value={form.primary_niche}
                onChange={(e) => setForm({ ...form, primary_niche: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={createCompetitor.isPending}>
              {createCompetitor.isPending ? "Adding..." : "Add Competitor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
