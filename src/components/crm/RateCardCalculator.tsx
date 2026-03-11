import { useState } from "react";
import {
  DollarSign, Plus, Trash2, Pencil, Check, X, Video, Share2, Mail, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRateCard, RateCardItem } from "@/hooks/use-rate-card";

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  video: { label: "YouTube Video", icon: Video, color: "text-red-400" },
  addon: { label: "Cross-Platform Add-on", icon: Share2, color: "text-blue-400" },
  newsletter: { label: "Newsletter", icon: Mail, color: "text-amber-400" },
};

function CategoryIcon({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.video;
  const Icon = meta.icon;
  return <Icon className={`w-4 h-4 ${meta.color}`} />;
}

function EditableRow({
  item,
  onSave,
  onDelete,
}: {
  item: RateCardItem;
  onSave: (updates: Partial<RateCardItem> & { id: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState(String(item.price));

  const handleSave = () => {
    onSave({ id: item.id, name, description, price: parseFloat(price) || 0 });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(item.name);
    setDescription(item.description ?? "");
    setPrice(String(item.price));
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="border-b border-border bg-muted/20">
        <td className="px-4 py-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs mb-1" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-7 text-xs" placeholder="Description" />
        </td>
        <td className="px-4 py-2">
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 text-xs pl-6 w-24" />
          </div>
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}><Check className="w-3.5 h-3.5 text-green-400" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}><X className="w-3.5 h-3.5 text-muted-foreground" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border hover:bg-muted/10 transition-colors group">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CategoryIcon category={item.category} />
          <div>
            <p className="text-xs font-medium text-foreground">{item.name}</p>
            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {item.price > 0 ? (
          <p className="text-sm font-bold font-mono text-foreground">${item.price.toLocaleString()}</p>
        ) : (
          <Badge variant="secondary" className="text-xs">Included</Badge>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
        </div>
      </td>
    </tr>
  );
}

function AddItemForm({ onAdd }: { onAdd: (item: Omit<RateCardItem, "id" | "workspace_id">) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("video");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name, description, price: parseFloat(price) || 0, category, sort_order: 99, is_active: true });
    setName(""); setDescription(""); setPrice(""); setCategory("video");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        <Plus className="w-3 h-3 mr-1" /> Add item
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="video">Video</option>
          <option value="addon">Add-on</option>
          <option value="newsletter">Newsletter</option>
        </select>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="h-8 text-xs flex-1" />
      </div>
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="h-8 text-xs" />
      <div className="flex items-center gap-2">
        <div className="relative">
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className="h-8 text-xs pl-6 w-28" />
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleSubmit}>Add</Button>
      </div>
    </div>
  );
}

export function RateCardCalculator() {
  const { items, isLoading, needsSeed, seedDefaults, updateItem, addItem, deleteItem } = useRateCard();

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 animate-pulse h-96" />;
  }

  if (needsSeed) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
        <DollarSign className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No rate card set up yet. Load default pricing?</p>
        <Button onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
          {seedDefaults.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Initialize Rate Card
        </Button>
      </div>
    );
  }

  const grouped: Record<string, RateCardItem[]> = {};
  for (const item of items) {
    (grouped[item.category] ??= []).push(item);
  }

  const totalBase = items.filter((i) => i.category === "video").reduce((s, i) => Math.max(s, i.price), 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Video Tiers</p>
          <p className="text-lg font-bold font-mono text-foreground">{grouped.video?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Add-ons</p>
          <p className="text-lg font-bold font-mono text-foreground">{(grouped.addon?.length ?? 0) + (grouped.newsletter?.length ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Top Rate</p>
          <p className="text-lg font-bold font-mono text-foreground">${totalBase.toLocaleString()}</p>
        </div>
      </div>

      {/* Rate Table */}
      {(["video", "addon", "newsletter"] as const).map((cat) => {
        const catItems = grouped[cat];
        if (!catItems?.length) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
              <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{meta.label}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">Item</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider w-32">Price</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {catItems.map((item) => (
                  <EditableRow
                    key={item.id}
                    item={item}
                    onSave={(u) => updateItem.mutate(u)}
                    onDelete={(id) => deleteItem.mutate(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <AddItemForm onAdd={(item) => addItem.mutate(item)} />
    </div>
  );
}
