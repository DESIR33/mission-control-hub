import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ensureWorkspace } from "@/lib/workspace";

interface WorkspaceContextType {
  workspaceId: string | null;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  isLoading: true,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkspaceId(null);
      setIsLoading(false);
      return;
    }

    ensureWorkspace(user.id, user.email ?? "user")
      .then((id) => setWorkspaceId(id))
      .catch((err) => console.error("Workspace init failed:", err))
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
