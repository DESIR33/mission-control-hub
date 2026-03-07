import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useContacts } from "@/hooks/use-contacts";
import { useDeals, type Deal } from "@/hooks/use-deals";

export type EmailPriority = "P1" | "P2" | "P3" | "P4";

export interface SmartEmail {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  preview: string;
  received_at: string;
  is_read: boolean;
  priority: EmailPriority;
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
  labels: string[];
}

interface RawInboxEmail {
  id: string;
  from_email: string;
  from_name: string;
  subject: string;
  preview: string;
  received_at: string;
  is_read: boolean;
  labels: string[];
}

const ACTIVE_DEAL_STAGES: string[] = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
];

export function useSmartInbox() {
  const { workspaceId } = useWorkspace();
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();

  const rawEmailsQuery = useQuery({
    queryKey: ["inbox-emails", workspaceId],
    queryFn: async (): Promise<RawInboxEmail[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("inbox_emails" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("received_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return ((data as any[]) ?? []).map((row) => ({
        id: row.id as string,
        from_email: (row.from_email as string) ?? "",
        from_name: (row.from_name as string) ?? "",
        subject: (row.subject as string) ?? "",
        preview: (row.preview as string) ?? "",
        received_at: (row.received_at as string) ?? "",
        is_read: (row.is_read as boolean) ?? false,
        labels: (row.labels as string[]) ?? [],
      }));
    },
    enabled: !!workspaceId,
  });

  const smartEmails = useMemo((): SmartEmail[] => {
    const rawEmails = rawEmailsQuery.data ?? [];

    // Build a lookup of contacts by email (lowercased)
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

    // Build a lookup of active deals by contact_id
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

    const enriched: SmartEmail[] = rawEmails.map((email) => {
      const matchedContact =
        contactByEmail.get(email.from_email.toLowerCase()) ?? null;

      const matchedDeal = matchedContact
        ? activeDealByContactId.get(matchedContact.id) ?? null
        : null;

      let priority: EmailPriority;
      if (matchedDeal) {
        priority = "P1";
      } else if (
        matchedContact &&
        matchedContact.tier &&
        matchedContact.tier !== "none"
      ) {
        priority = "P2";
      } else if (matchedContact) {
        priority = "P3";
      } else {
        priority = "P4";
      }

      return {
        ...email,
        priority,
        matched_contact: matchedContact,
        matched_deal: matchedDeal,
        labels: email.labels ?? [],
      };
    });

    // Sort by priority (P1 first), then by date descending
    const priorityOrder: Record<EmailPriority, number> = {
      P1: 1,
      P2: 2,
      P3: 3,
      P4: 4,
    };

    return enriched.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return (
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      );
    });
  }, [rawEmailsQuery.data, contacts, deals]);

  return {
    data: smartEmails,
    isLoading: rawEmailsQuery.isLoading,
    error: rawEmailsQuery.error,
  };
}

export function useSyncOutlook() {
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("outlook-sync", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useInboxStats() {
  const { data: emails = [] } = useSmartInbox();

  return useMemo(() => {
    const total = emails.length;
    const unread = emails.filter((e) => !e.is_read).length;
    const p1Count = emails.filter((e) => e.priority === "P1").length;
    const p2Count = emails.filter((e) => e.priority === "P2").length;
    const p3Count = emails.filter((e) => e.priority === "P3").length;
    const p4Count = emails.filter((e) => e.priority === "P4").length;

    return { total, unread, p1Count, p2Count, p3Count, p4Count };
  }, [emails]);
}
