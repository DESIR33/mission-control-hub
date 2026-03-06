import { useState } from "react";
import { Tag as TagIcon, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useTags,
  useEntityTags,
  useCreateTag,
  useToggleEntityTag,
} from "@/hooks/use-tags";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

interface TagPickerProps {
  entityId: string;
  entityType: "contact" | "company" | "deal";
}

export default function TagPicker({ entityId, entityType }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[5]);

  const { data: allTags = [] } = useTags();
  const { data: entityTags = [] } = useEntityTags(entityId, entityType);
  const createTag = useCreateTag();
  const toggleTag = useToggleEntityTag();

  const entityTagIds = new Set(entityTags.map((t) => t.id));

  const handleToggle = (tagId: string) => {
    toggleTag.mutate({ tagId, entityId, entityType });
  };

  const handleCreate = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    try {
      const tag = await createTag.mutateAsync({
        name: trimmed,
        color: newTagColor,
      });
      // Automatically assign the newly created tag
      toggleTag.mutate({ tagId: tag.id, entityId, entityType });
      setNewTagName("");
      setShowCreate(false);
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entityTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="gap-1 pr-1"
          style={{
            borderColor: tag.color,
            color: tag.color,
            backgroundColor: `${tag.color}10`,
          }}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => handleToggle(tag.id)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
            aria-label={`Remove tag ${tag.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
            <TagIcon className="h-3 w-3" />
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <div className="space-y-3">
            <p className="text-sm font-medium">Tags</p>

            {/* Existing tags list */}
            {allTags.length > 0 && (
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {allTags.map((tag) => {
                  const isActive = entityTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggle(tag.id)}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                        isActive ? "bg-muted" : ""
                      }`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 truncate">{tag.name}</span>
                      {isActive && (
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Create tag form */}
            {showCreate ? (
              <div className="space-y-2 border-t pt-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className={`h-5 w-5 rounded-full border-2 transition-transform ${
                        newTagColor === color
                          ? "scale-110 border-foreground"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={handleCreate}
                    disabled={!newTagName.trim() || createTag.isPending}
                  >
                    {createTag.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setShowCreate(false);
                      setNewTagName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-start gap-1.5 text-xs"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3 w-3" />
                Create tag
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
