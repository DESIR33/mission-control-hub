import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_FEATURES = [
  { key: "tasks", label: "Tasks", description: "Task management with projects and domains", category: "Productivity" },
  { key: "inbox", label: "Inbox", description: "Email inbox and communication hub", category: "Communication" },
  { key: "content_pipeline", label: "Content Pipeline", description: "Plan and manage content production", category: "Content" },
  { key: "trend_scanner", label: "Trend Scanner", description: "Discover trending topics", category: "Content" },
  { key: "content_management", label: "Content Management", description: "YouTube analytics and optimization", category: "Content" },
  { key: "growth", label: "Growth", description: "Growth forecasting and competitor intel", category: "Analytics" },
  { key: "finance", label: "Finance", description: "Revenue, expenses, budgets, and tax", category: "Business" },
  { key: "network", label: "Network", description: "CRM contacts and relationships", category: "Business" },
  { key: "subscribers", label: "Subscribers", description: "Newsletter subscribers and engagement", category: "Audience" },
  { key: "reports", label: "Reports", description: "Weekly and custom reports", category: "Analytics" },
  { key: "ai_hub", label: "AI Hub", description: "AI chat, agents, memory, and proposals", category: "Intelligence" },
  { key: "integrations", label: "Integrations", description: "Third-party service connections", category: "System" },
];

export function CreateWorkspaceDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(
    new Set(DEFAULT_FEATURES.map((f) => f.key))
  );
  const { switchWorkspace, refreshWorkspaces } = useWorkspace();

  const toggleFeature = (key: string) => {
    setEnabledFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setEnabledFeatures(new Set(DEFAULT_FEATURES.map((f) => f.key)));
  const selectNone = () => setEnabledFeatures(new Set());

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const slug = trimmed.replace(/[^a-z0-9]/gi, "-").toLowerCase() + "-" + Date.now().toString(36);
      const { data, error } = await supabase.rpc("create_workspace", {
        ws_name: trimmed,
        ws_slug: slug,
      });

      if (error) throw error;
      if (!data) throw new Error("No workspace ID returned");

      const wsId = data as string;

      // Disable unchecked features
      const disabledKeys = DEFAULT_FEATURES
        .filter((f) => !enabledFeatures.has(f.key))
        .map((f) => f.key);

      if (disabledKeys.length > 0) {
        const { error: updateError } = await supabase
          .from("workspace_features")
          .update({ enabled: false })
          .eq("workspace_id", wsId)
          .in("feature_key", disabledKeys);

        if (updateError) console.error("Failed to set feature defaults:", updateError);
      }

      await refreshWorkspaces();
      switchWorkspace(wsId);
      toast.success("Workspace created!");
      setName("");
      setEnabledFeatures(new Set(DEFAULT_FEATURES.map((f) => f.key)));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  // Group features by category
  const categories = Array.from(new Set(DEFAULT_FEATURES.map((f) => f.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Agency"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAll}>All</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={selectNone}>None</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Select which features this workspace needs. You can change this later in Settings.
            </p>
            <ScrollArea className="h-[240px] rounded-md border p-3">
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h4>
                    {DEFAULT_FEATURES.filter((f) => f.category === cat).map((feature) => (
                      <label
                        key={feature.key}
                        className="flex items-start gap-2.5 cursor-pointer rounded-md p-1.5 hover:bg-secondary/40 transition-colors"
                      >
                        <Checkbox
                          checked={enabledFeatures.has(feature.key)}
                          onCheckedChange={() => toggleFeature(feature.key)}
                          className="mt-0.5"
                        />
                        <div className="space-y-0">
                          <span className="text-sm font-medium">{feature.label}</span>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
