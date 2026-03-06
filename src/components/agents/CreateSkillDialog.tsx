import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Zap } from "lucide-react";
import type { AgentSkill } from "@/types/agents";

interface CreateSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (skill: {
    name: string;
    slug: string;
    description: string;
    category: AgentSkill["category"];
  }) => void;
  isLoading: boolean;
}

export function CreateSkillDialog({
  open,
  onOpenChange,
  onSave,
  isLoading,
}: CreateSkillDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AgentSkill["category"]>("general");

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const handleSave = () => {
    if (!name.trim() || !description.trim()) return;
    onSave({ name: name.trim(), slug, description: description.trim(), category });
    setName("");
    setDescription("");
    setCategory("general");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Create Custom Skill
          </DialogTitle>
          <DialogDescription>
            Define a new skill that agents can use. The skill description becomes the AI's instruction for when and how to use it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Skill Name</Label>
            <Input
              id="skill-name"
              placeholder="e.g., Analyze Upload Frequency"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                Slug: <code className="bg-muted px-1 rounded">{slug}</code>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-description">Description / Instruction</Label>
            <Textarea
              id="skill-description"
              placeholder="Describe what this skill does and when the agent should use it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as AgentSkill["category"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competitor">Competitor</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="audience">Audience</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !description.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Create Skill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
