import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
import { useContacts } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";

export type EmailPriority = "P1" | "P2" | "P3" | "P4";

export interface InboxEmail {
  id: string;
  workspace_id: string;
  message_id: string;
  conversation_id: string | null;
  from_email: string;
  from_name: string;
  to_recipients: Array<{ name: string; email: string }>;
  subject: string;
  preview: string;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  is_pinned: boolean;
  importance: string;
  has_attachments: boolean;
  folder: string;
  labels: string[];
  metadata: Record<string, unknown>;
  ai_category: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmartEmail extends InboxEmail {
  priority: EmailPriority;
  has_replied: boolean;
  matched_contact: {
    id: string;
    first_name: string;
    last_name: string | null;
    tier: string | null;
  } | null;
  matched_deal: {
    id: string;
    title: string;
    stage: string;
    value: number | null;
  } | null;
}

const ACTIVE_DEAL_STAGES: string[] = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
];

export function useInboxEmails(folder: string = "inbox", searchQuery: string = "") {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["inbox-emails", workspaceId, folder, searchQuery],
    queryFn: async (): Promise<InboxEmail[]> => {
      if (!workspaceId) return [];

      let query = supabase
        .from("inbox_emails" as any)
        .select("id, workspace_id, message_id, conversation_id, from_email, from_name, to_recipients, subject, preview, body_html, received_at, is_read, is_pinned, importance, has_attachments, folder, labels, metadata, ai_category, ai_summary, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("received_at", { ascending: false })
        .limit(200);

      // Category-based virtual folders (cat:opportunity, cat:newsletter, etc.)
      if (folder.startsWith("cat:")) {
        const category = folder.replace("cat:", "");
        query = query.eq("folder", "inbox");
        if (category === "unclassified") {
          query = query.is("ai_category" as any, null);
        } else {
          query = query.eq("ai_category", category);
        }
      } else {
        query = query.eq("folder", folder);
      }

      if (searchQuery) {
        query = query.or(`subject.ilike.%${searchQuery}%,from_name.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%,preview.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data as any[]) ?? []).map((row) => ({
        id: row.id as string,
        workspace_id: row.workspace_id as string,
        message_id: (row.message_id as string) ?? "",
        conversation_id: (row.conversation_id as string) ?? null,
        from_email: (row.from_email as string) ?? "",
        from_name: (row.from_name as string) ?? "",
        to_recipients: (row.to_recipients as any[]) ?? [],
        subject: (row.subject as string) ?? "",
        preview: (row.preview as string) ?? "",
        body_html: (row.body_html as string) ?? null,
        received_at: (row.received_at as string) ?? "",
        is_read: (row.is_read as boolean) ?? false,
        is_pinned: (row.is_pinned as boolean) ?? false,
        importance: (row.importance as string) ?? "normal",
        has_attachments: (row.has_attachments as boolean) ?? false,
        folder: (row.folder as string) ?? "inbox",
        labels: (row.labels as string[]) ?? [],
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        ai_category: (row.ai_category as string) ?? null,
        ai_summary: (row.ai_summary as string) ?? null,
        created_at: (row.created_at as string) ?? "",
        updated_at: (row.updated_at as string) ?? "",
      }));
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });
}

export function useSmartInbox(folder: string = "inbox", searchQuery: string = "") {
  const { data: rawEmails = [], isLoading, error } = useInboxEmails(folder, searchQuery);
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const { workspaceId } = useWorkspace();

  // Fetch conversation_ids that have sent replies
  const { data: repliedConversationIds = new Set<string>() } = useQuery({
    queryKey: ["replied-conversations", workspaceId],
    queryFn: async (): Promise<Set<string>> => {
      if (!workspaceId) return new Set();
      const { data, error } = await supabase
        .from("inbox_emails" as any)
        .select("conversation_id")
        .eq("workspace_id", workspaceId)
        .eq("folder", "sent")
        .not("conversation_id", "is", null);
      if (error) throw error;
      return new Set(
        ((data as any[]) ?? [])
          .map((r: any) => r.conversation_id as string)
          .filter(Boolean)
      );
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });

  const smartEmails = useMemo((): SmartEmail[] => {
    const contactByEmail = new Map<
      string,
      { id: string; first_name: string; last_name: string | null; tier: string | null }
    >();
    for (const c of contacts) {
      if (c.email) {
        contactByEmail.set(c.email.toLowerCase(), {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          tier: c.vip_tier ?? null,
        });
      }
    }

    const activeDealByContactId = new Map<
      string,
      { id: string; title: string; stage: string; value: number | null }
    >();
    for (const d of deals) {
      if (d.contact_id && ACTIVE_DEAL_STAGES.includes(d.stage)) {
        activeDealByContactId.set(d.contact_id, {
          id: d.id,
          title: d.title,
          stage: d.stage,
          value: d.value,
        });
      }
    }

    return rawEmails.map((email) => {
      const matchedContact = contactByEmail.get(email.from_email.toLowerCase()) ?? null;
      const matchedDeal = matchedContact
        ? activeDealByContactId.get(matchedContact.id) ?? null
        : null;
      const has_replied = !!email.conversation_id && repliedConversationIds.has(email.conversation_id);

      let priority: EmailPriority;
      if (matchedDeal) {
        priority = "P1";
      } else if (matchedContact && matchedContact.tier && matchedContact.tier !== "none") {
        priority = "P2";
      } else if (matchedContact) {
        priority = "P3";
      } else {
        priority = "P4";
      }

      return { ...email, priority, has_replied, matched_contact: matchedContact, matched_deal: matchedDeal };
    });
  }, [rawEmails, contacts, deals, repliedConversationIds]);

  return { data: smartEmails, isLoading, error };
}

export function useInboxStats(folder?: string) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["inbox-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { total: 0, unread: 0 };

      const [{ count: total }, { count: unread }] = await Promise.all([
        supabase
          .from("inbox_emails" as any)
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("folder", "inbox"),
        supabase
          .from("inbox_emails" as any)
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("folder", "inbox")
          .eq("is_read", false),
      ]);

      return { total: total ?? 0, unread: unread ?? 0 };
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });
}

export function useFolderCounts() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["inbox-folder-counts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return {};

      const folders = ["inbox", "sent", "junk", "trash", "archive", "drafts"];
      const results = await Promise.all(
        folders.map((f) =>
          supabase
            .from("inbox_emails" as any)
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .eq("folder", f)
        )
      );

      const counts: Record<string, number> = {};
      folders.forEach((f, i) => {
        const c = results[i].count ?? 0;
        if (c > 0) counts[f] = c;
      });
      return counts;
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });
}

export function useCategoryCounts() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["inbox-category-counts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return {};

      const categories = ["opportunity", "newsletter", "marketing"];
      const results = await Promise.all([
        ...categories.map((cat) =>
          supabase
            .from("inbox_emails" as any)
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .eq("folder", "inbox")
            .eq("ai_category", cat)
        ),
        // Unclassified = ai_category is null
        supabase
          .from("inbox_emails" as any)
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("folder", "inbox")
          .is("ai_category" as any, null),
      ]);

      const counts: Record<string, number> = {};
      categories.forEach((cat, i) => {
        const c = results[i].count ?? 0;
        if (c > 0) counts[cat] = c;
      });
      const unclassifiedCount = results[categories.length].count ?? 0;
      if (unclassifiedCount > 0) counts["unclassified"] = unclassifiedCount;
      return counts;
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, is_read }: { ids: string[]; is_read: boolean }) => {
      const { error } = await supabase
        .from("inbox_emails" as any)
        .update({ is_read })
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, is_read }) => {
      await queryClient.cancelQueries({ queryKey: ["inbox-emails"] });
      const previous = queryClient.getQueriesData({ queryKey: ["inbox-emails"] });
      queryClient.setQueriesData({ queryKey: ["inbox-emails"] }, (old: any) =>
        old?.map((e: any) => (ids.includes(e.id) ? { ...e, is_read } : e))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, data]: any) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from("inbox_emails" as any)
        .update({ is_pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
    },
  });
}

export function useMoveEmail() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, folder }: { ids: string[]; folder: string }) => {
      // If moving to junk, also report on Outlook
      if (folder === "junk" && workspaceId) {
        const { data: emails } = await supabase
          .from("inbox_emails" as any)
          .select("message_id")
          .in("id", ids);
        const messageIds = ((emails as any[]) ?? []).map((e) => e.message_id).filter(Boolean);
        if (messageIds.length > 0) {
          supabase.functions.invoke("outlook-manage", {
            body: { workspace_id: workspaceId, action: "junk", message_ids: messageIds },
          }).catch((err) => console.error("Outlook junk sync failed:", err));
        }
      }

      const { error } = await supabase
        .from("inbox_emails" as any)
        .update({ folder })
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: ["inbox-emails"] });
      const previous = queryClient.getQueriesData({ queryKey: ["inbox-emails"] });
      queryClient.setQueriesData({ queryKey: ["inbox-emails"] }, (old: any) =>
        old?.filter((e: any) => !ids.includes(e.id))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, data]: any) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-folder-counts"] });
    },
  });
}

export function useDeleteEmail() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Get message_ids before deleting locally, then sync to Outlook
      if (workspaceId) {
        const { data: emails } = await supabase
          .from("inbox_emails" as any)
          .select("message_id")
          .in("id", ids);
        const messageIds = ((emails as any[]) ?? []).map((e) => e.message_id).filter(Boolean);
        if (messageIds.length > 0) {
          supabase.functions.invoke("outlook-manage", {
            body: { workspace_id: workspaceId, action: "delete", message_ids: messageIds },
          }).catch((err) => console.error("Outlook delete sync failed:", err));
        }
      }

      const { error } = await supabase
        .from("inbox_emails" as any)
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["inbox-emails"] });
      const previous = queryClient.getQueriesData({ queryKey: ["inbox-emails"] });
      queryClient.setQueriesData({ queryKey: ["inbox-emails"] }, (old: any) =>
        old?.filter((e: any) => !ids.includes(e.id))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, data]: any) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-folder-counts"] });
    },
  });
}

export function useSyncOutlook() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folder: string = "inbox") => {
      const { data, error } = await supabase.functions.invoke("outlook-sync", {
        body: { workspace_id: workspaceId, folder, sync_all_folders: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; fetched: number; upserted: number; folders_synced: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-emails"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-stats"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-folder-counts"] });
    },
  });
}

export function useOutlookSend() {
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (args: {
      to?: string;
      subject?: string;
      body_html?: string;
      reply_to_message_id?: string;
      forward_to?: string;
      comment?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("outlook-send", {
        body: { workspace_id: workspaceId, ...args },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useOutlookAuthUrl() {
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("outlook-auth-url", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
  });
}

export function useOutlookAuthCallback() {
  const { workspaceId } = useWorkspace();

  return useMutation({
    mutationFn: async (args: { code: string; state: string }) => {
      const { data, error } = await supabase.functions.invoke("outlook-auth-callback", {
        body: { workspace_id: workspaceId, ...args },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}
