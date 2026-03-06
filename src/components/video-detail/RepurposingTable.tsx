import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import type { VideoRepurpose } from "@/hooks/use-video-repurposes";

const TYPES = ["short", "clip", "tweet", "thread", "ig_reel", "pinterest", "blog", "other"] as const;
const STATUSES = ["planned", "in_progress", "published", "archived"] as const;

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

interface Props {
  repurposes: VideoRepurpose[];
  onCreate: (item: Partial<VideoRepurpose>) => void;
  onUpdate: (item: { id: string } & Partial<VideoRepurpose>) => void;
  onRemove: (id: string) => void;
  isCreating: boolean;
}

export function RepurposingTable({ repurposes, onCreate, onUpdate, onRemove, isCreating }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ repurpose_type: "short", url: "", notes: "" });

  const handleCreate = () => {
    onCreate({
      repurpose_type: form.repurpose_type,
      url: form.url || null,
      notes: form.notes || null,
      status: "planned",
    });
    setForm({ repurpose_type: "short", url: "", notes: "" });
    setShowForm(false);
  };

  const totalViews = repurposes.reduce((s, r) => s + (r.views ?? 0), 0);
  const published = repurposes.filter((r) => r.status === "published").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Repurposed Content ({repurposes.length})</h3>
          {repurposes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {published} published · {fmtCount(totalViews)} total views
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Repurpose
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Type</Label>
              <Select value={form.repurpose_type} onValueChange={(v) => setForm({ ...form, repurpose_type: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" className="text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={isCreating}>Create</Button>
          </div>
        </div>
      )}

      {repurposes.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No repurposed content yet. Track shorts, clips, threads, and more.</p>
        </div>
      )}

      {repurposes.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Views</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Link</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Notes</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {repurposes.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-2.5 capitalize">{r.repurpose_type.replace("_", " ")}</td>
                  <td className="p-2.5">
                    <Select value={r.status} onValueChange={(v) => onUpdate({ id: r.id, status: v, ...(v === "published" ? { published_at: new Date().toISOString() } : {}) })}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2.5 font-mono">{fmtCount(r.views ?? 0)}</td>
                  <td className="p-2.5">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 text-xs">
                        <ExternalLink className="w-3 h-3" /> Link
                      </a>
                    ) : "—"}
                  </td>
                  <td className="p-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{r.notes || "—"}</td>
                  <td className="p-2.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(r.id)} aria-label="Remove repurpose">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
