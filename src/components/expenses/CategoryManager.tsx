import { useState } from "react";
import { Plus, Trash2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateCategory, useDeleteCategory, type ExpenseCategory } from "@/hooks/use-expenses";

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#64748b",
];

interface Props {
  categories: ExpenseCategory[];
}

export function CategoryManager({ categories }: Props) {
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createCategory.mutateAsync({ name: newName.trim(), color: newColor });
    setNewName("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium">New Category</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Software, Travel..."
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1">
            <Palette className="h-3.5 w-3.5" /> Color
          </label>
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ backgroundColor: c, borderColor: c === newColor ? "hsl(var(--foreground))" : "transparent" }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
        </div>
        <Button onClick={handleAdd} size="sm" disabled={!newName.trim() || createCategory.isPending} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-medium">{cat.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => deleteCategory.mutate(cat.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
            No categories yet. Create your first category above.
          </p>
        )}
      </div>
    </div>
  );
}
