import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Memory, MemoryVersion, DailyLog, ServiceSnapshot, MemoryOrigin } from "@/types/assistant";

const query = (table: string) => (supabase as any).from(table);

export function useAssistantMemory() {
  const { workspaceId } = useWorkspace();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [snapshots, setSnapshots] = useState<ServiceSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<Memory[] | null>(null);
  const [logDate, setLogDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const loadMemories = useCallback(async () => {
    if (!workspaceId) return;
    let q = query("assistant_memory")
      .select("id, content, origin, tags, current_version, agent_scope, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (originFilter !== "all") q = q.eq("origin", originFilter);
    const { data } = await q;
    setMemories((data as Memory[]) || []);
  }, [workspaceId, originFilter]);

  const loadLogs = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await query("assistant_daily_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("log_date", logDate)
      .order("created_at", { ascending: true });
    setLogs((data as DailyLog[]) || []);
  }, [workspaceId, logDate]);

  const loadSnapshots = useCallback(async () => {
    if (!workspaceId) return;
    const results: ServiceSnapshot[] = [];
    for (const svc of ["youtube", "crm", "email"]) {
      const { data } = await query("assistant_service_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("service", svc)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) results.push(data as ServiceSnapshot);
    }
    setSnapshots(results);
  }, [workspaceId]);

  const createMemory = useCallback(
    async (content: string, origin: MemoryOrigin, tags: string[] = [], agentScope?: string[]) => {
      if (!workspaceId) return;
      setIsLoading(true);
      try {
        await supabase.functions.invoke("assistant-memory-manage", {
          body: { action: "create", workspace_id: workspaceId, content, origin, tags, agent_scope: agentScope },
        });
        await loadMemories();
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, loadMemories]
  );

  const updateMemory = useCallback(
    async (id: string, content: string, origin: MemoryOrigin, tags: string[] = [], agentScope?: string[]) => {
      if (!workspaceId) return;
      setIsLoading(true);
      try {
        await supabase.functions.invoke("assistant-memory-manage", {
          body: { action: "update", workspace_id: workspaceId, id, content, origin, tags, agent_scope: agentScope },
        });
        await loadMemories();
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, loadMemories]
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      if (!workspaceId) return;
      await supabase.functions.invoke("assistant-memory-manage", {
        body: { action: "delete", workspace_id: workspaceId, id },
      });
      await loadMemories();
    },
    [workspaceId, loadMemories]
  );

  const getVersions = useCallback(
    async (memoryId: string): Promise<MemoryVersion[]> => {
      if (!workspaceId) return [];
      const { data } = await supabase.functions.invoke("assistant-memory-manage", {
        body: { action: "get_versions", workspace_id: workspaceId, id: memoryId },
      });
      return (data as MemoryVersion[]) || [];
    },
    [workspaceId]
  );

  const rollbackMemory = useCallback(
    async (memoryId: string, versionNumber: number) => {
      if (!workspaceId) return;
      setIsLoading(true);
      try {
        await supabase.functions.invoke("assistant-memory-manage", {
          body: { action: "rollback", workspace_id: workspaceId, id: memoryId, version_number: versionNumber },
        });
        await loadMemories();
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, loadMemories]
  );

  const searchMemories = useCallback(
    async (searchQuery: string, origin?: string) => {
      if (!workspaceId || !searchQuery.trim()) {
        setSearchResults(null);
        return;
      }
      setIsLoading(true);
      try {
        const { data } = await supabase.functions.invoke("assistant-memory-manage", {
          body: {
            action: "search",
            workspace_id: workspaceId,
            query: searchQuery,
            origin_filter: origin || "any",
          },
        });
        setSearchResults((data as Memory[]) || []);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId]
  );

  const createLog = useCallback(
    async (content: string, source: string) => {
      if (!workspaceId) return;
      await query("assistant_daily_logs").insert({
        workspace_id: workspaceId,
        content,
        source,
      });
      await loadLogs();
    },
    [workspaceId, loadLogs]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      if (!workspaceId) return;
      await query("assistant_daily_logs").delete().eq("id", id);
      await loadLogs();
    },
    [workspaceId, loadLogs]
  );

  useEffect(() => { loadMemories(); }, [loadMemories]);
  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  return {
    memories, logs, snapshots, isLoading, originFilter, searchResults, logDate,
    setOriginFilter, setLogDate,
    createMemory, updateMemory, deleteMemory, searchMemories,
    getVersions, rollbackMemory,
    createLog, deleteLog, loadSnapshots,
  };
}
