import { useState } from "react";
import {
  Plus, Trash2, ExternalLink, RefreshCw, Users, Pencil, X, Check,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CompetitorBenchmark } from "../CompetitorBenchmark";
import { CompetitorIntelligence } from "../CompetitorIntelligence";
import { CompetitorActivityFeed } from "../CompetitorActivityFeed";
import { CompetitorWarRoom } from "../CompetitorWarRoom";
import {
  useCompetitorChannels, useCreateCompetitor, useUpdateCompetitor,
  useDeleteCompetitor, useSyncCompetitors,
  type CompetitorChannel,
} from "@/hooks/use-competitor-benchmarking";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const emptyForm = {
  channel_name: "",
  channel_url: "",
  subscriber_count: "",
  video_count: "",
  total_view_count: "",
  primary_niche: "",
};

function fmtCount(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ── Manage Competitors Tab ──
function ManageCompetitorsTab() {
  const { data: competitors = [], isLoading } = useCompetitorChannels();
  const deleteCompetitor = useDeleteCompetitor();
  const updateCompetitor = useUpdateCompetitor();
  const syncCompetitors = useSyncCompetitors();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ channel_name: "", channel_url: "", primary_niche: "" });

  const startEdit = (comp: CompetitorChannel) => {
    setEditingId(comp.id);
    setEditForm({
      channel_name: comp.channel_name,
      channel_url: comp.channel_url || "",
      primary_niche: comp.primary_niche || "",
    });
  };

  const saveEdit = () => {
    if (!editingId || !editForm.channel_name.trim()) return;
    updateCompetitor.mutate(
      {
        id: editingId,
        channel_name: editForm.channel_name.trim(),
        channel_url: editForm.channel_url || null,
        primary_niche: editForm.primary_niche || null,
      },
      {
        onSuccess: () => {
          setEditingId(null);
          toast.success("Competitor updated");
        },
      }
    );
  };

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-64" />;
  }

  return (
    <div className="space-y-4">
      {/* Sync bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <div className="text-xs text-muted-foreground">
          {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} tracked
          {competitors[0]?.last_synced_at && (
            <span className="ml-2">
              · Last synced {formatDistanceToNow(new Date(competitors[0].last_synced_at), { addSuffix: true })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => syncCompetitors.mutate(undefined, {
            onSuccess: () => toast.success("Competitor stats synced from YouTube!"),
            onError: () => toast.error("Sync failed — check YouTube integration"),
          })}
          disabled={syncCompetitors.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncCompetitors.isPending ? "animate-spin" : ""}`} />
          {syncCompetitors.isPending ? "Syncing…" : "Sync from YouTube"}
        </Button>
      </div>

      {/* Competitor list */}
      {competitors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No competitors added yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Add Competitor" above to start tracking competitor channels.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {competitors.map((comp) => (
            <div key={comp.id} className="rounded-xl border border-border bg-card p-4">
              {editingId === comp.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Channel name *"
                      value={editForm.channel_name}
                      onChange={(e) => setEditForm({ ...editForm, channel_name: e.target.value })}
                    />
                    <Input
                      placeholder="Channel URL"
                      value={editForm.channel_url}
                      onChange={(e) => setEditForm({ ...editForm, channel_url: e.target.value })}
                    />
                    <Input
                      placeholder="Niche"
                      value={editForm.primary_niche}
                      onChange={(e) => setEditForm({ ...editForm, primary_niche: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit} disabled={updateCompetitor.isPending}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{comp.channel_name}</p>
                      {comp.primary_niche && (
                        <Badge variant="secondary" className="text-[10px] h-5">{comp.primary_niche}</Badge>
                      )}
                      {comp.youtube_channel_id && (
                        <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">ID linked</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      {comp.subscriber_count != null && <span>{fmtCount(comp.subscriber_count)} subscribers</span>}
                      {comp.video_count != null && <span>{comp.video_count} videos</span>}
                      {comp.total_view_count != null && <span>{fmtCount(Number(comp.total_view_count))} views</span>}
                      {comp.avg_views_per_video != null && <span>~{fmtCount(comp.avg_views_per_video)}/video</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {comp.channel_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={comp.channel_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(comp)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove "{comp.channel_name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove this competitor and all its tracked stats. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCompetitor.mutate(comp.id, { onSuccess: () => toast.success("Competitor removed") })}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Section ──
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

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="manage">Manage Channels</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
          <TabsTrigger value="intel">Deep Intel</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="warroom">War Room</TabsTrigger>
        </TabsList>
        <TabsContent value="manage"><ManageCompetitorsTab /></TabsContent>
        <TabsContent value="benchmark"><CompetitorBenchmark /></TabsContent>
        <TabsContent value="intel"><CompetitorIntelligence /></TabsContent>
        <TabsContent value="activity"><CompetitorActivityFeed /></TabsContent>
        <TabsContent value="warroom"><CompetitorWarRoom /></TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                className="col-span-2"
                placeholder="Channel name *"
                value={form.channel_name}
                onChange={(e) => setForm({ ...form, channel_name: e.target.value })}
              />
              <Input
                className="col-span-2"
                placeholder="Channel URL (e.g. https://youtube.com/@channel)"
                value={form.channel_url}
                onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
              />
              <Input
                placeholder="Subscribers"
                type="number"
                value={form.subscriber_count}
                onChange={(e) => setForm({ ...form, subscriber_count: e.target.value })}
              />
              <Input
                placeholder="Video count"
                type="number"
                value={form.video_count}
                onChange={(e) => setForm({ ...form, video_count: e.target.value })}
              />
              <Input
                placeholder="Total views"
                type="number"
                value={form.total_view_count}
                onChange={(e) => setForm({ ...form, total_view_count: e.target.value })}
              />
              <Input
                placeholder="Niche (e.g. Tech Reviews)"
                value={form.primary_niche}
                onChange={(e) => setForm({ ...form, primary_niche: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Just add the name and URL — stats will auto-fill when you click "Sync from YouTube".
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={createCompetitor.isPending}>
              {createCompetitor.isPending ? "Adding…" : "Add Competitor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
