import { useState } from "react";
import {
  Users, Plus, Handshake, TrendingUp, ExternalLink,
  Trash2, UserPlus, Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollaborations, useCreateCollaboration, useUpdateCollaboration, useDeleteCollaboration } from "@/hooks/use-collaborations";
import { toast } from "sonner";

const statusSteps = ["prospect", "contacted", "negotiating", "confirmed", "published"];
const statusColors: Record<string, string> = {
  prospect: "bg-gray-500",
  contacted: "bg-blue-500",
  negotiating: "bg-yellow-500",
  confirmed: "bg-green-500",
  published: "bg-purple-500",
  declined: "bg-red-500",
};

const collabTypeLabels: Record<string, string> = {
  guest: "Guest Appearance",
  interview: "Interview",
  collab_video: "Collab Video",
  shoutout: "Shoutout",
  cross_promo: "Cross Promo",
  other: "Other",
};

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export function CollaborationTracker() {
  const { data: collabs = [], isLoading } = useCollaborations();
  const createCollab = useCreateCollaboration();
  const updateCollab = useUpdateCollaboration();
  const deleteCollab = useDeleteCollaboration();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    creator_name: "",
    channel_url: "",
    subscriber_count: "",
    niche: "",
    collab_type: "collab_video" as string,
  });

  const handleAdd = () => {
    if (!form.creator_name.trim()) return;
    createCollab.mutate(
      {
        creator_name: form.creator_name,
        channel_url: form.channel_url || null,
        subscriber_count: form.subscriber_count ? Number(form.subscriber_count) : null,
        niche: form.niche || null,
        collab_type: form.collab_type as any,
        status: "prospect",
      },
      {
        onSuccess: () => {
          setForm({ creator_name: "", channel_url: "", subscriber_count: "", niche: "", collab_type: "collab_video" });
          setShowAdd(false);
          toast.success("Collaboration added");
        },
      }
    );
  };

  const byStatus = statusSteps.reduce(
    (acc, s) => {
      acc[s] = collabs.filter((c) => c.status === s);
      return acc;
    },
    {} as Record<string, typeof collabs>
  );

  const totalExpectedSubs = collabs.reduce((s, c) => s + (c.expected_sub_gain ?? 0), 0);
  const totalActualSubs = collabs.reduce((s, c) => s + (c.actual_sub_gain ?? 0), 0);

  if (isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 animate-pulse h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Handshake className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{collabs.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserPlus className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmed</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{byStatus.confirmed?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expected Subs</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtCount(totalExpectedSubs)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual Subs</p>
          </div>
          <p className="text-lg font-bold font-mono text-foreground">{fmtCount(totalActualSubs)}</p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Collaboration Pipeline</h3>
        <div className="flex items-center gap-1 mb-4 overflow-x-auto">
          {statusSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50">
                <div className={`w-2 h-2 rounded-full ${statusColors[step]}`} />
                <span className="text-[10px] text-foreground capitalize whitespace-nowrap">{step}</span>
                <span className="text-[10px] font-mono text-muted-foreground">({byStatus[step]?.length ?? 0})</span>
              </div>
              {i < statusSteps.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Add Form */}
      <div className="rounded-lg border border-border bg-card p-4">
        {showAdd ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Creator name"
                value={form.creator_name}
                onChange={(e) => setForm({ ...form, creator_name: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Channel URL"
                value={form.channel_url}
                onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Subscriber count"
                type="number"
                value={form.subscriber_count}
                onChange={(e) => setForm({ ...form, subscriber_count: e.target.value })}
              />
              <input
                className="bg-muted/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border"
                placeholder="Niche"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="bg-muted/50 rounded px-2 py-1 text-xs text-foreground border border-border outline-none"
                value={form.collab_type}
                onChange={(e) => setForm({ ...form, collab_type: e.target.value })}
              >
                {Object.entries(collabTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={createCollab.isPending}>Add</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Collaboration
          </Button>
        )}
      </div>

      {/* Collaboration List */}
      <div className="space-y-2">
        {collabs.map((collab) => (
          <div key={collab.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[collab.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{collab.creator_name}</p>
                  {collab.subscriber_count && (
                    <span className="text-[10px] text-muted-foreground">{fmtCount(collab.subscriber_count)} subs</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {collab.collab_type && (
                    <span className="text-[10px] text-muted-foreground">{collabTypeLabels[collab.collab_type] ?? collab.collab_type}</span>
                  )}
                  {collab.niche && <span className="text-[10px] text-muted-foreground">· {collab.niche}</span>}
                  {collab.scheduled_date && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" /> {collab.scheduled_date}
                    </span>
                  )}
                </div>
              </div>
              <select
                className="bg-muted/50 rounded px-2 py-1 text-[10px] text-foreground border border-border outline-none"
                value={collab.status}
                onChange={(e) =>
                  updateCollab.mutate({ id: collab.id, status: e.target.value as any })
                }
              >
                {statusSteps.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="declined">declined</option>
              </select>
              {collab.channel_url && (
                <a href={collab.channel_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-blue-400">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                className="text-muted-foreground hover:text-red-500 transition-colors"
                onClick={() => deleteCollab.mutate(collab.id, { onSuccess: () => toast.success("Removed") })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {collabs.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>No collaborations tracked yet. Start adding potential collab partners!</p>
          </div>
        )}
      </div>
    </div>
  );
}
