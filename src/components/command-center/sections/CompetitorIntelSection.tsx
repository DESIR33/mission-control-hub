import { useState } from "react";
import {
  Plus, Trash2, ExternalLink, RefreshCw, Users, Pencil, X, Check,
  Eye, PlaySquare, TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CompetitorBenchmark } from "../CompetitorBenchmark";
import { CompetitorIntelligence } from "../CompetitorIntelligence";
import { CompetitorActivityFeed } from "../CompetitorActivityFeed";
import { CompetitorWarRoom } from "../CompetitorWarRoom";
import { CompetitorSponsorScanner } from "../CompetitorSponsorScanner";
import {
  useCompetitorChannels, useCreateCompetitor, useUpdateCompetitor,
  useDeleteCompetitor, useSyncCompetitors,
  type CompetitorChannel,
} from "@/hooks/use-competitor-benchmarking";
import { toast } from "sonner";
import { safeFormatDistanceToNow } from "@/lib/date-utils";
import { DistanceToNow } from "date-fns";

const emptyForm = {
  channel_name: "",
  channel_url: "",
  youtube_channel_id: "",
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

// ── Competitor Card ──
function CompetitorCard({
  comp,
  onEdit,
  onDelete,
}: {
  comp: CompetitorChannel;
  onEdit: (comp: CompetitorChannel) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground truncate">{comp.channel_name}</h3>
            {comp.primary_niche && (
              <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{comp.primary_niche}</Badge>
            )}
          </div>
          {comp.youtube_channel_id && (
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{comp.youtube_channel_id}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {comp.channel_url && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={comp.channel_url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(comp)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
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
                <AlertDialogAction onClick={() => onDelete(comp.id)}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCell icon={Users} label="Subscribers" value={fmtCount(comp.subscriber_count)} />
        <StatCell icon={Eye} label="Total Views" value={fmtCount(comp.total_view_count ? Number(comp.total_view_count) : null)} />
        <StatCell icon={PlaySquare} label="Videos" value={comp.video_count != null ? comp.video_count.toLocaleString() : "—"} />
        <StatCell icon={TrendingUp} label="Avg Views" value={fmtCount(comp.avg_views_per_video)} />
      </div>

      {/* Footer */}
      {comp.last_synced_at && (
        <p className="text-[10px] text-muted-foreground">
          Synced {safeFormatDistanceToNow(comp.last_synced_at, { addSuffix: true })}
        </p>
      )}
    </div>
  );
}

function StatCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-muted/50 p-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ── Edit Dialog ──
function EditDialog({
  comp,
  open,
  onClose,
}: {
  comp: CompetitorChannel | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateCompetitor = useUpdateCompetitor();
  const [form, setForm] = useState({ channel_name: "", channel_url: "", youtube_channel_id: "", primary_niche: "" });

  // Sync form when comp changes
  if (comp && form.channel_name === "" && open) {
    setForm({
      channel_name: comp.channel_name,
      channel_url: comp.channel_url || "",
      youtube_channel_id: comp.youtube_channel_id || "",
      primary_niche: comp.primary_niche || "",
    });
  }

  const handleSave = () => {
    if (!comp || !form.channel_name.trim()) return;
    updateCompetitor.mutate(
      {
        id: comp.id,
        channel_name: form.channel_name.trim(),
        channel_url: form.channel_url || null,
        youtube_channel_id: form.youtube_channel_id.trim() || null,
        primary_niche: form.primary_niche || null,
      },
      {
        onSuccess: () => {
          onClose();
          toast.success("Competitor updated");
        },
      }
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setForm({ channel_name: "", channel_url: "", youtube_channel_id: "", primary_niche: "" });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Competitor</DialogTitle>
          <DialogDescription>Update competitor channel details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Channel name *"
            value={form.channel_name}
            onChange={(e) => setForm({ ...form, channel_name: e.target.value })}
          />
          <Input
            placeholder="Channel URL"
            value={form.channel_url}
            onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
          />
          <Input
            placeholder="YouTube Channel ID (e.g. UCxxxx…)"
            value={form.youtube_channel_id}
            onChange={(e) => setForm({ ...form, youtube_channel_id: e.target.value })}
          />
          <Input
            placeholder="Niche"
            value={form.primary_niche}
            onChange={(e) => setForm({ ...form, primary_niche: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateCompetitor.isPending}>
            {updateCompetitor.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Manage Competitors Tab ──
function ManageCompetitorsTab() {
  const { data: competitors = [], isLoading } = useCompetitorChannels();
  const deleteCompetitor = useDeleteCompetitor();
  const syncCompetitors = useSyncCompetitors();
  const [editComp, setEditComp] = useState<CompetitorChannel | null>(null);

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
              · Last synced {safeFormatDistanceToNow(competitors[0].last_synced_at, { addSuffix: true })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => syncCompetitors.mutate(undefined, {
            onSuccess: (data: any) => {
              const msg = data?.synced != null
                ? `Synced ${data.synced} of ${data.total} competitors`
                : "Competitor stats synced!";
              toast.success(msg);
              if (data?.errors?.length) {
                data.errors.forEach((e: string) => toast.error(e, { duration: 6000 }));
              }
            },
            onError: (err: any) => toast.error(err?.message || "Sync failed — check YouTube integration"),
          })}
          disabled={syncCompetitors.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncCompetitors.isPending ? "animate-spin" : ""}`} />
          {syncCompetitors.isPending ? "Syncing…" : "Sync from YouTube"}
        </Button>
      </div>

      {/* Competitor cards */}
      {competitors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No competitors added yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Add Competitor" above to start tracking competitor channels.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map((comp) => (
            <CompetitorCard
              key={comp.id}
              comp={comp}
              onEdit={(c) => setEditComp(c)}
              onDelete={(id) => deleteCompetitor.mutate(id, { onSuccess: () => toast.success("Competitor removed") })}
            />
          ))}
        </div>
      )}

      <EditDialog comp={editComp} open={!!editComp} onClose={() => setEditComp(null)} />
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
        youtube_channel_id: form.youtube_channel_id?.trim() || null,
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
          <TabsTrigger value="sponsors">Sponsor Scanner</TabsTrigger>
        </TabsList>
        <TabsContent value="manage"><ManageCompetitorsTab /></TabsContent>
        <TabsContent value="benchmark"><CompetitorBenchmark /></TabsContent>
        <TabsContent value="intel"><CompetitorIntelligence /></TabsContent>
        <TabsContent value="activity"><CompetitorActivityFeed /></TabsContent>
        <TabsContent value="warroom"><CompetitorWarRoom /></TabsContent>
        <TabsContent value="sponsors"><CompetitorSponsorScanner /></TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor Channel</DialogTitle>
            <DialogDescription>Track a competitor's YouTube channel to benchmark against.</DialogDescription>
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
                className="col-span-2"
                placeholder="YouTube Channel ID (e.g. UCxxxx…)"
                value={form.youtube_channel_id}
                onChange={(e) => setForm({ ...form, youtube_channel_id: e.target.value })}
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
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createCompetitor.isPending}>
              {createCompetitor.isPending ? "Adding…" : "Add Competitor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
