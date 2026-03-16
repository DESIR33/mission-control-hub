import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSubscriberTags, useCreateSubscriberTag, useSubscriberTagAssignments, useToggleSubscriberTag } from "@/hooks/use-subscriber-tags";
import { useToast } from "@/hooks/use-toast";
import { Tags, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TAG_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316",
];

interface SubscriberTagPickerProps {
  subscriberId: string;
}

export function SubscriberTagPicker({ subscriberId }: SubscriberTagPickerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  const { data: tags = [] } = useSubscriberTags();
  const { data: assignedTagIds = [] } = useSubscriberTagAssignments(subscriberId);
  const createTag = useCreateSubscriberTag();
  const toggleTag = useToggleSubscriberTag();
  const { toast } = useToast();

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTag.mutateAsync({ name: newTagName.trim(), color: selectedColor });
      setNewTagName("");
      toast({ title: "Tag created" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggle = async (tagId: string) => {
    const assigned = assignedTagIds.includes(tagId);
    try {
      await toggleTag.mutateAsync({ subscriberId, tagId, assigned });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Tags className="w-3.5 h-3.5" />
          Tags
          {assignedTagIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs px-1.5">
              {assignedTagIds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</p>

          {tags.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {tags.map((tag) => {
                const isAssigned = assignedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggle(tag.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm text-foreground flex-1 text-left">{tag.name}</span>
                    {isAssigned && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-border pt-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="h-7 text-sm bg-secondary border-border"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex gap-1 mt-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all",
                    selectedColor === color && "ring-2 ring-offset-1 ring-primary"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
