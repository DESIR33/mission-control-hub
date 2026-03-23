import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ensureWorkspace } from "@/lib/workspace";

interface WorkspaceContextType {
  workspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  isLoading: true,
  error: null,
  retry: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
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

  const initWorkspace = useCallback(async (userId: string, email: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const id = await ensureWorkspace(userId, email);
        if (requestId !== requestIdRef.current) return;
        setWorkspaceId(id);
        setIsLoading(false);
        return;
      } catch (err) {
        lastError = err;
        console.error(`Workspace init attempt ${attempt}/3 failed:`, err);

        if (isAuthError(err)) {
          break;
        }

        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 700 * attempt));
        }
      }
    }

    if (requestId !== requestIdRef.current) return;
    setWorkspaceId(null);
    setError(lastError instanceof Error ? lastError.message : "Failed to load workspace");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    requestIdRef.current += 1;

    if (!user) {
      setWorkspaceId(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    initWorkspace(user.id, user.email ?? "user");
  }, [user, initWorkspace]);

  const retry = useCallback(() => {
    if (user) {
      initWorkspace(user.id, user.email ?? "user");
    }
  }, [user, initWorkspace]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, isLoading, error, retry }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
