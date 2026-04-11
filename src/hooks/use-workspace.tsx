import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ensureWorkspace } from "@/lib/workspace";

const ACTIVE_WS_KEY = "desmily_active_workspace";

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceContextType {
  workspaceId: string | null;
  workspaces: WorkspaceInfo[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  switchWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  workspaces: [],
  isLoading: true,
  error: null,
  retry: () => {},
  switchWorkspace: () => {},
  refreshWorkspaces: async () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const isAuthError = (err: unknown) => {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    return (
      message.includes("jwt") ||
      message.includes("auth") ||
      message.includes("session") ||
      message.includes("invalid claim") ||
      message.includes("permission") ||
      message.includes("401") ||
      message.includes("403")
    );
  };

  const fetchWorkspaces = useCallback(async (userId: string): Promise<WorkspaceInfo[]> => {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(id, name, slug)")
      .eq("user_id", userId);

    if (error) throw new Error("Failed to fetch workspaces: " + error.message);

    return (data ?? []).map((m: any) => ({
      id: m.workspaces.id,
      name: m.workspaces.name,
      slug: m.workspaces.slug,
      role: m.role,
    }));
  }, []);

  const initWorkspace = useCallback(async (userId: string, email: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Ensure at least one workspace exists
        await ensureWorkspace(userId, email);

        // Fetch all workspaces
        const wsList = await fetchWorkspaces(userId);
        if (requestId !== requestIdRef.current) return;

        setWorkspaces(wsList);

        // Determine active workspace
        const stored = localStorage.getItem(ACTIVE_WS_KEY);
        const activeWs = wsList.find(w => w.id === stored) ?? wsList[0];

        if (activeWs) {
          setWorkspaceId(activeWs.id);
          localStorage.setItem(ACTIVE_WS_KEY, activeWs.id);
        }

        setIsLoading(false);
        return;
      } catch (err) {
        lastError = err;
        console.error(`Workspace init attempt ${attempt}/3 failed:`, err);
        if (isAuthError(err)) break;
        if (attempt < 3) await new Promise((r) => setTimeout(r, 700 * attempt));
      }
    }

    if (requestId !== requestIdRef.current) return;
    setWorkspaceId(null);
    setError(lastError instanceof Error ? lastError.message : "Failed to load workspace");
    setIsLoading(false);
  }, [fetchWorkspaces]);

  useEffect(() => {
    requestIdRef.current += 1;
    if (!user) {
      setWorkspaceId(null);
      setWorkspaces([]);
      setIsLoading(false);
      setError(null);
      return;
    }
    initWorkspace(user.id, user.email ?? "user");
  }, [user, initWorkspace]);

  const retry = useCallback(() => {
    if (user) initWorkspace(user.id, user.email ?? "user");
  }, [user, initWorkspace]);

  const switchWorkspace = useCallback((id: string) => {
    const ws = workspaces.find(w => w.id === id);
    if (ws) {
      setWorkspaceId(id);
      localStorage.setItem(ACTIVE_WS_KEY, id);
    }
  }, [workspaces]);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;
    try {
      const wsList = await fetchWorkspaces(user.id);
      setWorkspaces(wsList);
      // If current workspace was deleted, switch to first
      if (workspaceId && !wsList.find(w => w.id === workspaceId) && wsList.length > 0) {
        setWorkspaceId(wsList[0].id);
        localStorage.setItem(ACTIVE_WS_KEY, wsList[0].id);
      }
    } catch (err) {
      console.error("Failed to refresh workspaces:", err);
    }
  }, [user, fetchWorkspaces, workspaceId]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspaces, isLoading, error, retry, switchWorkspace, refreshWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
