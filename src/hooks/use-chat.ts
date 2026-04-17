import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { safeGetTime } from "@/lib/date-utils";
import type { ChatMessage, ChatSession } from "@/types/assistant";

const query = (table: string) => (supabase as any).from(table);

const SESSIONS_KEY = "chat-sessions";
const SESSION_MESSAGES_KEY = "chat-session-messages";

async function fetchSessions(workspaceId: string): Promise<ChatSession[]> {
  const { data } = await query("assistant_conversations")
    .select("session_id, content, role, created_at, metadata")
    .eq("workspace_id", workspaceId)
    .eq("role", "user")
    .order("created_at", { ascending: true });

  if (!data) return [];
  const map = new Map<string, ChatSession>();
  for (const msg of data as any[]) {
    if (!map.has(msg.session_id)) {
      const renamedTitle = msg.metadata?.renamed_title;
      map.set(msg.session_id, {
        session_id: msg.session_id,
        title: renamedTitle || msg.content.slice(0, 60),
        created_at: msg.created_at,
        message_count: 1,
      });
    } else {
      map.get(msg.session_id)!.message_count++;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => safeGetTime(b.created_at) - safeGetTime(a.created_at)
  );
}

async function fetchSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await query("assistant_conversations")
    .select("id, role, content, metadata, created_at")
    .eq("session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  return (data as ChatMessage[]) || [];
}

export function useChat() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [memoriesUsed, setMemoriesUsed] = useState<any[]>([]);
  const [toolsCalled, setToolsCalled] = useState<string[]>([]);

  const { data: sessions = [] } = useQuery({
    queryKey: [SESSIONS_KEY, workspaceId],
    queryFn: () => fetchSessions(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });

  const { data: persistedMessages = [] } = useQuery({
    queryKey: [SESSION_MESSAGES_KEY, sessionId],
    queryFn: () => fetchSessionMessages(sessionId),
    enabled: !!sessionId && !!workspaceId,
    staleTime: 30_000,
  });

  // Merge persisted + optimistic so UI sees immediate feedback during sendMessage.
  const messages = [...persistedMessages, ...optimisticMessages];

  const invalidateSessions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [SESSIONS_KEY, workspaceId] });
  }, [queryClient, workspaceId]);

  const invalidateMessages = useCallback(
    (sid: string) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_MESSAGES_KEY, sid] });
    },
    [queryClient]
  );

  const loadSession = useCallback((sid: string) => {
    setSessionId(sid);
    setOptimisticMessages([]);
    setMemoriesUsed([]);
    setToolsCalled([]);
  }, []);

  const newSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setOptimisticMessages([]);
    setMemoriesUsed([]);
    setToolsCalled([]);
  }, []);

  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      model,
      targetSessionId,
    }: {
      content: string;
      model?: string;
      targetSessionId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: {
          session_id: targetSessionId,
          message: content,
          workspace_id: workspaceId,
          model,
        },
      });
      if (error) throw error;
      return data;
    },
  });

  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!workspaceId || !content.trim()) return;

      const targetSessionId = sessionId;
      const userMsg: ChatMessage = {
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setOptimisticMessages((prev) => [...prev, userMsg]);

      try {
        const data = await sendMutation.mutateAsync({ content, model, targetSessionId });
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.response,
          metadata: {
            memories_used: data.memories_used?.length || 0,
            tools_called: data.tools_called || [],
            agent_delegated: data.agent_delegated || false,
          },
          created_at: new Date().toISOString(),
        };
        setOptimisticMessages((prev) => [...prev, assistantMsg]);
        setMemoriesUsed(data.memories_used || []);
        setToolsCalled(data.tools_called || []);
        invalidateSessions();
        invalidateMessages(targetSessionId);
      } catch (err: any) {
        console.error("Chat error:", err);
        setOptimisticMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.message || "Failed to get response"}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    },
    [workspaceId, sessionId, sendMutation, invalidateSessions, invalidateMessages]
  );

  const deleteSession = useCallback(
    async (sid: string) => {
      if (!workspaceId) return;
      await query("assistant_conversations")
        .delete()
        .eq("session_id", sid)
        .eq("workspace_id", workspaceId);
      if (sid === sessionId) newSession();
      invalidateSessions();
      invalidateMessages(sid);
    },
    [workspaceId, sessionId, newSession, invalidateSessions, invalidateMessages]
  );

  const renameSession = useCallback(
    async (sid: string, newTitle: string) => {
      if (!workspaceId) return;
      // Optimistic title update without a full refetch.
      queryClient.setQueryData<ChatSession[] | undefined>(
        [SESSIONS_KEY, workspaceId],
        (prev) =>
          prev?.map((s) => (s.session_id === sid ? { ...s, title: newTitle } : s))
      );
      const { data } = await query("assistant_conversations")
        .select("id")
        .eq("session_id", sid)
        .eq("workspace_id", workspaceId)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1);
      if (data && data.length > 0) {
        await query("assistant_conversations")
          .update({ metadata: { renamed_title: newTitle } })
          .eq("id", data[0].id);
      }
    },
    [workspaceId, queryClient]
  );

  return {
    sessionId,
    sessions,
    messages,
    isLoading: sendMutation.isPending,
    memoriesUsed,
    toolsCalled,
    sendMessage,
    loadSession,
    newSession,
    deleteSession,
    renameSession,
  };
}
