import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TaskDomain } from "@/types/tasks";

interface TaskDomainContextValue {
  domains: TaskDomain[];
  activeDomainId: string | null;
  setActiveDomainId: (id: string | null) => void;
  activeDomain: TaskDomain | null;
  isLoading: boolean;
}

const TaskDomainContext = createContext<TaskDomainContextValue>({
  domains: [],
  activeDomainId: null,
  setActiveDomainId: () => {},
  activeDomain: null,
  isLoading: true,
});

export function TaskDomainProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useWorkspace();

  const [activeDomainId, setActiveDomainIdState] = useState<string | null>(() => {
    try { return localStorage.getItem("task_active_domain") || null; } catch { return null; }
  });

  const setActiveDomainId = (id: string | null) => {
    setActiveDomainIdState(id);
    try { if (id) localStorage.setItem("task_active_domain", id); else localStorage.removeItem("task_active_domain"); } catch {}
  };

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["task-domains", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase as any).from("task_domains").select("*").eq("workspace_id", workspaceId).order("sort_order");
      if (error) throw error;
      return data as TaskDomain[];
    },
    enabled: !!workspaceId,
  });

  const activeDomain = domains.find((d) => d.id === activeDomainId) ?? null;

  return (
    <TaskDomainContext.Provider value={{ domains, activeDomainId, setActiveDomainId, activeDomain, isLoading }}>
      {children}
    </TaskDomainContext.Provider>
  );
}

export const useTaskDomain = () => useContext(TaskDomainContext);
