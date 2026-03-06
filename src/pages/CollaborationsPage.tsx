import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  TrendingUp,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Trash2,
  ExternalLink,
  BarChart3,
  Loader2,
  Handshake,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCollaborations,
  useCreateCollaboration,
  useUpdateCollaboration,
  useDeleteCollaboration,
  type Collaboration,
} from "@/hooks/use-collaborations";

const STATUSES = [
  "prospect",
  "contacted",
  "negotiating",
  "confirmed",
  "published",
  "declined",
] as const;

type CollabStatus = Collaboration["status"];
type CollabType = NonNullable<Collaboration["collab_type"]>;

const STATUS_LABELS: Record<CollabStatus, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  negotiating: "Negotiating",
  confirmed: "Confirmed",
  published: "Published",
  declined: "Declined",
};

const STATUS_COLORS: Record<CollabStatus, string> = {
  prospect: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  contacted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  negotiating: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  published: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  declined: "bg-red-500/15 text-red-400 border-red-500/30",
};

const COLLAB_TYPE_LABELS: Record<CollabType, string> = {
  guest: "Guest",
  interview: "Interview",
  collab_video: "Collab Video",
  shoutout: "Shoutout",
  cross_promo: "Cross Promo",
  other: "Other",
};

const COLLAB_TYPES: CollabType[] = [
  "guest",
  "interview",
  "collab_video",
  "shoutout",
  "cross_promo",
  "other",
];

function formatSubscribers(count: number | null): string {
  if (count === null || count === undefined) return "-";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatSubGain(val: number | null): string {
  if (val === null || val === undefined) return "-";
  if (val >= 1_000) return `+${(val / 1_000).toFixed(1)}K`;
  return `+${val.toLocaleString()}`;
}

interface CollabFormData {
  creator_name: string;
  channel_url: string;
  subscriber_count: string;
  niche: string;
  collab_type: CollabType | "";
  expected_sub_gain: string;
  actual_sub_gain: string;
  scheduled_date: string;
  notes: string;
  status: CollabStatus;
}

const EMPTY_FORM: CollabFormData = {
  creator_name: "",
  channel_url: "",
  subscriber_count: "",
  niche: "",
  collab_type: "",
  expected_sub_gain: "",
  actual_sub_gain: "",
  scheduled_date: "",
  notes: "",
  status: "prospect",
};

function formToPayload(form: CollabFormData): Partial<Collaboration> {
  return {
    creator_name: form.creator_name,
    channel_url: form.channel_url || null,
    subscriber_count: form.subscriber_count ? Number(form.subscriber_count) : null,
    niche: form.niche || null,
    collab_type: (form.collab_type as CollabType) || null,
    expected_sub_gain: form.expected_sub_gain ? Number(form.expected_sub_gain) : null,
    actual_sub_gain: form.actual_sub_gain ? Number(form.actual_sub_gain) : null,
    scheduled_date: form.scheduled_date || null,
    notes: form.notes || null,
    status: form.status,
  };
}

function collabToForm(c: Collaboration): CollabFormData {
  return {
    creator_name: c.creator_name,
    channel_url: c.channel_url ?? "",
    subscriber_count: c.subscriber_count?.toString() ?? "",
    niche: c.niche ?? "",
    collab_type: c.collab_type ?? "",
    expected_sub_gain: c.expected_sub_gain?.toString() ?? "",
    actual_sub_gain: c.actual_sub_gain?.toString() ?? "",
    scheduled_date: c.scheduled_date ?? "",
    notes: c.notes ?? "",
    status: c.status,
  };
}

// ---------- Summary Stats ----------

function SummaryStats({ collaborations }: { collaborations: Collaboration[] }) {
  const stats = useMemo(() => {
    const byCounts: Record<CollabStatus, number> = {
      prospect: 0,
      contacted: 0,
      negotiating: 0,
      confirmed: 0,
      published: 0,
      declined: 0,
    };
    let totalExpected = 0;
    let totalActual = 0;

    for (const c of collaborations) {
      byCounts[c.status]++;
      if (c.expected_sub_gain) totalExpected += c.expected_sub_gain;
      if (c.actual_sub_gain) totalActual += c.actual_sub_gain;
    }

    return { total: collaborations.length, byCounts, totalExpected, totalActual };
  }, [collaborations]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
        <p className="text-xl font-bold text-foreground">{stats.total}</p>
      </div>
      {STATUSES.map((s) => (
        <div key={s} className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {STATUS_LABELS[s]}
          </p>
          <p className="text-xl font-bold text-foreground">{stats.byCounts[s]}</p>
        </div>
      ))}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Expected / Actual Subs
        </p>
        <p className="text-lg font-bold text-foreground">
          {formatSubGain(stats.totalExpected)}{" "}
          <span className="text-muted-foreground text-sm">/</span>{" "}
          {formatSubGain(stats.totalActual)}
        </p>
      </div>
    </div>
  );
}

// ---------- ROI Section ----------

function ROISection({ collaborations }: { collaborations: Collaboration[] }) {
  const published = useMemo(
    () => collaborations.filter((c) => c.status === "published" && c.actual_sub_gain !== null),
    [collaborations]
  );

  if (published.length === 0) return null;

  const totalActual = published.reduce((sum, c) => sum + (c.actual_sub_gain ?? 0), 0);
  const totalExpected = published.reduce((sum, c) => sum + (c.expected_sub_gain ?? 0), 0);
  const avgGain = totalActual / published.length;
  const roiPercent = totalExpected > 0 ? ((totalActual / totalExpected) * 100).toFixed(0) : "N/A";

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Published Collaborations ROI</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Published Collabs
          </p>
          <p className="text-lg font-bold text-foreground">{published.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Total Sub Gain
          </p>
          <p className="text-lg font-bold text-emerald-400">{formatSubGain(totalActual)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Avg Sub Gain
          </p>
          <p className="text-lg font-bold text-foreground">{formatSubGain(Math.round(avgGain))}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Actual vs Expected
          </p>
          <p className="text-lg font-bold text-foreground">{roiPercent}%</p>
        </div>
      </div>
      <div className="space-y-2">
        {published.map((c) => {
          const pct =
            c.expected_sub_gain && c.expected_sub_gain > 0
              ? ((c.actual_sub_gain ?? 0) / c.expected_sub_gain) * 100
              : null;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between text-xs rounded-md bg-secondary/50 px-3 py-2"
            >
              <span className="font-medium text-foreground">{c.creator_name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  Expected: {formatSubGain(c.expected_sub_gain)}
                </span>
                <span className="text-emerald-400 font-medium">
                  Actual: {formatSubGain(c.actual_sub_gain)}
                </span>
                {pct !== null && (
                  <Badge
                    variant="outline"
                    className={
                      pct >= 100
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    }
                  >
                    {pct.toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Collab Card ----------

function CollabCard({
  collab,
  onSelect,
  onMoveForward,
  onMoveBack,
}: {
  collab: Collaboration;
  onSelect: () => void;
  onMoveForward: (() => void) | null;
  onMoveBack: (() => void) | null;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-3 space-y-2 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-1">
        <h4 className="text-sm font-semibold text-foreground truncate">{collab.creator_name}</h4>
        {collab.collab_type && (
          <Badge variant="outline" className="text-xs shrink-0">
            {COLLAB_TYPE_LABELS[collab.collab_type]}
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        {collab.subscriber_count !== null && (
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{formatSubscribers(collab.subscriber_count)} subs</span>
          </div>
        )}
        {collab.niche && (
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span className="truncate">{collab.niche}</span>
          </div>
        )}
        {collab.scheduled_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{collab.scheduled_date}</span>
          </div>
        )}
        {(collab.expected_sub_gain !== null || collab.actual_sub_gain !== null) && (
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>
              Exp: {formatSubGain(collab.expected_sub_gain)}
              {collab.actual_sub_gain !== null && (
                <> / Act: {formatSubGain(collab.actual_sub_gain)}</>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 pt-1">
        {onMoveBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMoveBack();
            }}
            title="Move to previous stage"
          >
            <ArrowLeft className="w-3 h-3" />
          </Button>
        )}
        {onMoveForward && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMoveForward();
            }}
            title="Move to next stage"
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
        )}
        {collab.channel_url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              window.open(collab.channel_url!, "_blank");
            }}
            title="Open channel"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- Kanban Column ----------

function KanbanColumn({
  status,
  collaborations,
  onSelect,
  onMove,
}: {
  status: CollabStatus;
  collaborations: Collaboration[];
  onSelect: (c: Collaboration) => void;
  onMove: (id: string, newStatus: CollabStatus) => void;
}) {
  const statusIdx = STATUSES.indexOf(status);

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] flex-1">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Badge variant="outline" className={`${STATUS_COLORS[status]} text-xs`}>
          {STATUS_LABELS[status]}
        </Badge>
        <span className="text-xs text-muted-foreground">{collaborations.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[60vh] pr-1">
        {collaborations.map((c) => {
          const canForward = statusIdx < STATUSES.length - 1;
          const canBack = statusIdx > 0;
          return (
            <CollabCard
              key={c.id}
              collab={c}
              onSelect={() => onSelect(c)}
              onMoveForward={
                canForward ? () => onMove(c.id, STATUSES[statusIdx + 1]) : null
              }
              onMoveBack={
                canBack ? () => onMove(c.id, STATUSES[statusIdx - 1]) : null
              }
            />
          );
        })}
        {collaborations.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">No collaborations</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Form Fields (shared between Add dialog and Edit sheet) ----------

function CollabFormFields({
  form,
  onChange,
  showStatus,
}: {
  form: CollabFormData;
  onChange: (f: CollabFormData) => void;
  showStatus?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="creator_name">Creator Name *</Label>
        <Input
          id="creator_name"
          value={form.creator_name}
          onChange={(e) => onChange({ ...form, creator_name: e.target.value })}
          placeholder="Creator name"
          className="bg-secondary border-border"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="channel_url">Channel URL</Label>
          <Input
            id="channel_url"
            value={form.channel_url}
            onChange={(e) => onChange({ ...form, channel_url: e.target.value })}
            placeholder="https://youtube.com/@..."
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subscriber_count">Subscriber Count</Label>
          <Input
            id="subscriber_count"
            type="number"
            value={form.subscriber_count}
            onChange={(e) => onChange({ ...form, subscriber_count: e.target.value })}
            placeholder="100000"
            className="bg-secondary border-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="niche">Niche</Label>
          <Input
            id="niche"
            value={form.niche}
            onChange={(e) => onChange({ ...form, niche: e.target.value })}
            placeholder="Tech, Gaming, etc."
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collab_type">Collab Type</Label>
          <Select
            value={form.collab_type || undefined}
            onValueChange={(v) => onChange({ ...form, collab_type: v as CollabType })}
          >
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {COLLAB_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {COLLAB_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showStatus && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => onChange({ ...form, status: v as CollabStatus })}
          >
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="expected_sub_gain">Expected Sub Gain</Label>
          <Input
            id="expected_sub_gain"
            type="number"
            value={form.expected_sub_gain}
            onChange={(e) => onChange({ ...form, expected_sub_gain: e.target.value })}
            placeholder="5000"
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="actual_sub_gain">Actual Sub Gain</Label>
          <Input
            id="actual_sub_gain"
            type="number"
            value={form.actual_sub_gain}
            onChange={(e) => onChange({ ...form, actual_sub_gain: e.target.value })}
            placeholder="4200"
            className="bg-secondary border-border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduled_date">Scheduled Date</Label>
        <Input
          id="scheduled_date"
          type="date"
          value={form.scheduled_date}
          onChange={(e) => onChange({ ...form, scheduled_date: e.target.value })}
          className="bg-secondary border-border"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          placeholder="Additional notes..."
          className="bg-secondary border-border min-h-[80px]"
        />
      </div>
    </div>
  );
}

// ---------- Main Content ----------

export default function CollaborationsPage() {
  const { data: collaborations = [], isLoading } = useCollaborations();
  const createCollab = useCreateCollaboration();
  const updateCollab = useUpdateCollaboration();
  const deleteCollab = useDeleteCollaboration();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<CollabFormData>(EMPTY_FORM);

  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null);
  const [editForm, setEditForm] = useState<CollabFormData>(EMPTY_FORM);
  const [sheetOpen, setSheetOpen] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<CollabStatus, Collaboration[]> = {
      prospect: [],
      contacted: [],
      negotiating: [],
      confirmed: [],
      published: [],
      declined: [],
    };
    for (const c of collaborations) {
      map[c.status].push(c);
    }
    return map;
  }, [collaborations]);

  // Move a collab to a new status
  const handleMove = async (id: string, newStatus: CollabStatus) => {
    try {
      await updateCollab.mutateAsync({ id, status: newStatus });
      toast.success(`Moved to ${STATUS_LABELS[newStatus]}`);
      // Update the sheet if viewing the same collab
      if (selectedCollab?.id === id) {
        setEditForm((prev) => ({ ...prev, status: newStatus }));
        setSelectedCollab((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      toast.error("Failed to update status", { description: err.message });
    }
  };

  // Open detail sheet
  const handleSelectCollab = (c: Collaboration) => {
    setSelectedCollab(c);
    setEditForm(collabToForm(c));
    setSheetOpen(true);
  };

  // Add collaboration
  const handleAdd = async () => {
    if (!addForm.creator_name.trim()) {
      toast.error("Creator name is required");
      return;
    }
    try {
      await createCollab.mutateAsync(formToPayload(addForm));
      toast.success(`Added ${addForm.creator_name}`);
      setAddForm(EMPTY_FORM);
      setAddDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to create collaboration", { description: err.message });
    }
  };

  // Update collaboration
  const handleUpdate = async () => {
    if (!selectedCollab) return;
    if (!editForm.creator_name.trim()) {
      toast.error("Creator name is required");
      return;
    }
    try {
      await updateCollab.mutateAsync({ id: selectedCollab.id, ...formToPayload(editForm) });
      toast.success(`Updated ${editForm.creator_name}`);
      setSheetOpen(false);
      setSelectedCollab(null);
    } catch (err: any) {
      toast.error("Failed to update collaboration", { description: err.message });
    }
  };

  // Delete collaboration
  const handleDelete = async () => {
    if (!selectedCollab) return;
    try {
      await deleteCollab.mutateAsync(selectedCollab.id);
      toast.success(`Deleted ${selectedCollab.creator_name}`);
      setSheetOpen(false);
      setSelectedCollab(null);
    } catch (err: any) {
      toast.error("Failed to delete collaboration", { description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
        <div className="flex items-center gap-2">
          <Handshake className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Collaborations</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-4 overflow-x-auto">
          {STATUSES.map((s) => (
            <div key={s} className="min-w-[260px] space-y-2">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Collaborations</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage YouTube creator collaborations through every stage.
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Collaboration
        </Button>
      </div>

      {/* Summary Stats */}
      <SummaryStats collaborations={collaborations} />

      {/* ROI Section */}
      <ROISection collaborations={collaborations} />

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            collaborations={grouped[status]}
            onSelect={handleSelectCollab}
            onMove={handleMove}
          />
        ))}
      </div>

      {/* Add Collaboration Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Collaboration</DialogTitle>
            <DialogDescription>
              Add a new creator collaboration to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <CollabFormFields form={addForm} onChange={setAddForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={createCollab.isPending}>
              {createCollab.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Collaboration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedCollab?.creator_name ?? "Collaboration Details"}</SheetTitle>
            <SheetDescription>
              Edit collaboration details or change its status.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CollabFormFields form={editForm} onChange={setEditForm} showStatus />
          </div>
          <SheetFooter className="mt-6 flex gap-2 sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteCollab.isPending}
            >
              {deleteCollab.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateCollab.isPending}>
                {updateCollab.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

