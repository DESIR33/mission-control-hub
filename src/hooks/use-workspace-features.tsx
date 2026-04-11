import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface WorkspaceFeature {
  id: string;
  feature_key: string;
  enabled: boolean;
  label: string;
  description: string | null;
  icon: string | null;
  category: string;
  sort_order: number;
}

/** Maps nav item paths to feature keys */
const NAV_FEATURE_MAP: Record<string, string> = {
  "/tasks": "tasks",
  "/inbox": "inbox",
  "/content": "content_pipeline",
  "/trends": "trend_scanner",
  "/youtube": "content_management",
  "/growth": "growth",
  "/finance": "finance",
  "/network": "network",
  "/subscribers": "subscribers",
  "/reports": "reports",
  "/ai": "ai_hub",
  "/integrations": "integrations",
};

interface WorkspaceFeaturesContextType {
  features: WorkspaceFeature[];
  isLoading: boolean;
  isFeatureEnabled: (featureKey: string) => boolean;
  isNavItemVisible: (path: string) => boolean;
  toggleFeature: (featureKey: string, enabled: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

const WorkspaceFeaturesContext = createContext<WorkspaceFeaturesContextType>({
  features: [],
  isLoading: true,
  isFeatureEnabled: () => true,
  isNavItemVisible: () => true,
  toggleFeature: async () => {},
  refetch: async () => {},
});

export function WorkspaceFeaturesProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useWorkspace();
  const [features, setFeatures] = useState<WorkspaceFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    if (!workspaceId) {
      setFeatures([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("workspace_features")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("sort_order");

      if (error) throw error;
      setFeatures((data as WorkspaceFeature[]) ?? []);
    } catch (err) {
      console.error("Failed to fetch workspace features:", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    setIsLoading(true);
    fetchFeatures();
  }, [fetchFeatures]);

  const isFeatureEnabled = useCallback(
    (featureKey: string) => {
      if (features.length === 0) return true; // default to visible while loading
      const f = features.find((feat) => feat.feature_key === featureKey);
      return f ? f.enabled : true;
    },
    [features]
  );

  const isNavItemVisible = useCallback(
    (path: string) => {
      // Mission Control and Settings are always visible
      if (path === "/" || path === "/settings") return true;
      const featureKey = NAV_FEATURE_MAP[path];
      if (!featureKey) return true;
      return isFeatureEnabled(featureKey);
    },
    [isFeatureEnabled]
  );

  const toggleFeature = useCallback(
    async (featureKey: string, enabled: boolean) => {
      if (!workspaceId) return;

      const { error } = await supabase
        .from("workspace_features")
        .update({ enabled })
        .eq("workspace_id", workspaceId)
        .eq("feature_key", featureKey);

      if (error) throw error;

      setFeatures((prev) =>
        prev.map((f) =>
          f.feature_key === featureKey ? { ...f, enabled } : f
        )
      );
    },
    [workspaceId]
  );

  return (
    <WorkspaceFeaturesContext.Provider
      value={{ features, isLoading, isFeatureEnabled, isNavItemVisible, toggleFeature, refetch: fetchFeatures }}
    >
      {children}
    </WorkspaceFeaturesContext.Provider>
  );
}

export const useWorkspaceFeatures = () => useContext(WorkspaceFeaturesContext);
