import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TagIcon, PlusIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import { useAutoLabels, useCreateAutoLabel, useDeleteAutoLabel, useToggleAutoLabel } from "@/hooks/use-auto-labels";

const colorOptions = [
  { value: "red", bg: "bg-red-500/10 text-red-700" },
  { value: "blue", bg: "bg-blue-500/10 text-blue-700" },
  { value: "green", bg: "bg-emerald-500/10 text-emerald-700" },
  { value: "amber", bg: "bg-amber-500/10 text-amber-700" },
  { value: "purple", bg: "bg-purple-500/10 text-purple-700" },
  { value: "pink", bg: "bg-pink-500/10 text-pink-700" },
  { value: "gray", bg: "bg-muted text-muted-foreground" },
];

export function AutoLabelsManager() {
  const { data: labels = [], isLoading } = useAutoLabels();
  const createLabel = useCreateAutoLabel();
  const deleteLabel = useDeleteAutoLabel();
  const toggleLabel = useToggleAutoLabel();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rule, setRule] = useState("");
  const [color, setColor] = useState("blue");

  const handleCreate = () => {
    if (!name.trim() || !rule.trim()) return;
    createLabel.mutate({ label_name: name, description, natural_language_rule: rule, color }, {
      onSuccess: () => { setDialogOpen(false); setName(""); setDescription(""); setRule(""); setColor("blue"); },
    });
  };

  const getColorClass = (c: string) => colorOptions.find((o) => o.value === c)?.bg || "bg-muted text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-primary" />
            Auto Labels
          </CardTitle>
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setDialogOpen(true)}>
            <PlusIcon className="h-3 w-3" /> New Label
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">AI automatically labels incoming emails based on your rules</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="flex justify-center py-4"><Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
        {labels.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">No labels yet. Create rules like "Investor emails about funding".</p>
        )}
        {labels.map((label) => (
          <div key={label.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Switch checked={label.is_active} onCheckedChange={(checked) => toggleLabel.mutate({ id: label.id, is_active: checked })} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`text-[10px] ${getColorClass(label.color)}`}>
                  {label.label_name}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{label.natural_language_rule}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteLabel.mutate(label.id)}>
              <Trash2Icon className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Create Auto Label</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Label name (e.g., Investor Update)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input placeholder="Rule: 'Emails about fundraising or investor updates'" value={rule} onChange={(e) => setRule(e.target.value)} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Color:</span>
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  className={`h-5 w-5 rounded-full border-2 ${opt.bg} ${color === opt.value ? "border-primary ring-2 ring-primary/30" : "border-transparent"}`}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createLabel.isPending}>
              {createLabel.isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
