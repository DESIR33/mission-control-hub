import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Trophy } from "lucide-react";
import type { VideoExperiment } from "@/hooks/use-video-experiments";

interface Props {
  experiments: VideoExperiment[];
  onCreate: (exp: Partial<VideoExperiment>) => void;
  onUpdate: (exp: { id: string } & Partial<VideoExperiment>) => void;
  onRemove: (id: string) => void;
  isCreating: boolean;
}

export function ExperimentsTable({ experiments, onCreate, onUpdate, onRemove, isCreating }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    experiment_type: "title" as "title" | "thumbnail",
    variant_a: "",
    variant_b: "",
    ctr_before: "",
    notes: "",
  });

  const handleCreate = () => {
    onCreate({
      experiment_type: form.experiment_type,
      variant_a: form.variant_a,
      variant_b: form.variant_b,
      ctr_before: form.ctr_before ? Number(form.ctr_before) : 0,
      notes: form.notes || null,
      started_at: new Date().toISOString(),
    });
    setForm({ experiment_type: "title", variant_a: "", variant_b: "", ctr_before: "", notes: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">A/B Experiments ({experiments.length})</h3>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Experiment
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <Select value={form.experiment_type} onValueChange={(v) => setForm({ ...form, experiment_type: v as any })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="thumbnail">Thumbnail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">CTR Before (%)</label>
              <Input type="number" step="0.1" value={form.ctr_before} onChange={(e) => setForm({ ...form, ctr_before: e.target.value })} placeholder="e.g. 5.2" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Variant A</label>
              <Input value={form.variant_a} onChange={(e) => setForm({ ...form, variant_a: e.target.value })} placeholder="Original" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Variant B</label>
              <Input value={form.variant_b} onChange={(e) => setForm({ ...form, variant_b: e.target.value })} placeholder="New variant" className="text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Hypothesis…" className="text-sm min-h-[60px]" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.variant_a || !form.variant_b || isCreating}>Create</Button>
          </div>
        </div>
      )}

      {experiments.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No experiments yet. Track title and thumbnail A/B tests here.</p>
        </div>
      )}

      {experiments.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Variant A</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Variant B</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">CTR Before</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">CTR After</th>
                <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Winner</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp) => (
                <tr key={exp.id} className="border-t border-border/50">
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${exp.experiment_type === "title" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}>
                      {exp.experiment_type}
                    </span>
                  </td>
                  <td className="p-2.5 text-foreground max-w-[150px] truncate">{exp.variant_a}</td>
                  <td className="p-2.5 text-foreground max-w-[150px] truncate">{exp.variant_b}</td>
                  <td className="p-2.5 font-mono">{exp.ctr_before ? `${exp.ctr_before}%` : "—"}</td>
                  <td className="p-2.5 font-mono">{exp.ctr_after ? `${exp.ctr_after}%` : "—"}</td>
                  <td className="p-2.5">
                    {exp.winner ? (
                      <span className="flex items-center gap-1 text-green-500 text-xs">
                        <Trophy className="w-3 h-3" /> {exp.winner}
                      </span>
                    ) : (
                      <Select
                        value={exp.winner ?? ""}
                        onValueChange={(v) => onUpdate({ id: exp.id, winner: v, ended_at: new Date().toISOString() })}
                      >
                        <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="Pick" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="p-2.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(exp.id)}>
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
