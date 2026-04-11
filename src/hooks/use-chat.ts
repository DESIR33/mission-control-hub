import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { safeGetTime } from "@/lib/date-utils";
import type { ChatMessage, ChatSession } from "@/types/assistant";

const query = (table: string) => (supabase as any).from(table);

export function useChat() {
  const { workspaceId } = useWorkspace();
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [memoriesUsed, setMemoriesUsed] = useState<any[]>([]);
  const [toolsCalled, setToolsCalled] = useState<string[]>([]);

  const loadSessions = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await query("assistant_conversations")
      .select("session_id, content, role, created_at, metadata")
      .eq("workspace_id", workspaceId)
      .eq("role", "user")
      .order("created_at", { ascending: true });

    if (!data) return;
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
    setSessions(
      Array.from(map.values()).sort(
        (a, b) =>
          safeGetTime(b.created_at) - safeGetTime(a.created_at)
      )
    );
  }, [workspaceId]);

  const loadSession = useCallback(
    async (sid: string) => {
      setSessionId(sid);
      if (!workspaceId) return;
      const { data } = await query("assistant_conversations")
        .select("id, role, content, metadata, created_at")
        .eq("session_id", sid)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: true });
      setMessages((data as ChatMessage[]) || []);
      setMemoriesUsed([]);
      setToolsCalled([]);
    },
    [workspaceId]
  );

  const newSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setMemoriesUsed([]);
    setToolsCalled([]);
  }, []);

  const deleteSession = useCallback(
    async (sid: string) => {
      if (!workspaceId) return;
      await query("assistant_conversations")
        .delete()
        .eq("session_id", sid)
        .eq("workspace_id", workspaceId);
      if (sid === sessionId) {
        newSession();
      }
      loadSessions();
    },
    [workspaceId, sessionId, newSession, loadSessions]
  );

  const renameSession = useCallback(
    async (sid: string, newTitle: string) => {
      setSessions((prev) =>
        prev.map((s) => (s.session_id === sid ? { ...s, title: newTitle } : s))
      );
      // Persist: update the first user message content's first 60 chars won't work,
      // so we store rename as a metadata update on the first message of the session
      if (!workspaceId) return;
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
    [workspaceId]
  );

  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!workspaceId || !content.trim()) return;
      setIsLoading(true);

      const userMsg: ChatMessage = {
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const { data, error } = await supabase.functions.invoke(
          "assistant-chat",
          {
            body: {
              session_id: sessionId,
              message: content,
              workspace_id: workspaceId,
              model,
            },
          }
        );

        if (error) throw error;

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
        setMessages((prev) => [...prev, assistantMsg]);
        setMemoriesUsed(data.memories_used || []);
        setToolsCalled(data.tools_called || []);
        loadSessions();
      } catch (err: any) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.message || "Failed to get response"}`,
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, sessionId, loadSessions]
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessionId,
    sessions,
    messages,
    isLoading,
    memoriesUsed,
    toolsCalled,
    sendMessage,
    loadSession,
    newSession,
    deleteSession,
    renameSession,
  };
}
