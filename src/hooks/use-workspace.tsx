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

    let cancelled = false;
    const init = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const id = await ensureWorkspace(user.id, user.email ?? "user");
          if (!cancelled) setWorkspaceId(id);
          return;
        } catch (err) {
          console.error(`Workspace init attempt ${attempt}/${retries} failed:`, err);
          if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    };
    init().finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
