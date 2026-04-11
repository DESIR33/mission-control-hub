import { useState } from "react";
import { motion } from "framer-motion";
import { Puzzle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceFeatures, WorkspaceFeature } from "@/hooks/use-workspace-features";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_LABELS: Record<string, string> = {
  productivity: "Productivity",
  communication: "Communication",
  content: "Content",
  analytics: "Analytics",
  business: "Business",
  audience: "Audience",
  intelligence: "AI & Intelligence",
  system: "System",
};

const CATEGORY_ORDER = [
  "productivity",
  "communication",
  "content",
  "analytics",
  "business",
  "audience",
  "intelligence",
  "system",
];

export function FeaturesSection() {
  const { features, isLoading, toggleFeature } = useWorkspaceFeatures();
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());

  const handleToggle = async (feature: WorkspaceFeature) => {
    setTogglingKeys((prev) => new Set(prev).add(feature.feature_key));
    try {
      await toggleFeature(feature.feature_key, !feature.enabled);
      toast.success(`${feature.label} ${!feature.enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error(`Failed to update ${feature.label}`);
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(feature.feature_key);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Group by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, WorkspaceFeature[]>>(
    (acc, cat) => {
      const items = features.filter((f) => f.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    },
    {}
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-primary" />
            <CardTitle>Features</CardTitle>
          </div>
          <CardDescription>
            Enable or disable features for this workspace. Disabled features are hidden from navigation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[category] ?? category}
              </h3>
              <div className="space-y-2">
                {items.map((feature) => (
                  <div
                    key={feature.feature_key}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="space-y-0.5 flex-1 mr-4">
                      <Label
                        htmlFor={`feat-${feature.feature_key}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {feature.label}
                      </Label>
                      {feature.description && (
                        <p className="text-xs text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {togglingKeys.has(feature.feature_key) && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        id={`feat-${feature.feature_key}`}
                        checked={feature.enabled}
                        onCheckedChange={() => handleToggle(feature)}
                        disabled={togglingKeys.has(feature.feature_key)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
