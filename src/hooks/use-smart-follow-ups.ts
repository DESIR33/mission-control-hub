import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";

const q = (table: string) => (supabase as any).from(table);

export interface SmartFollowUpItem {
  id: string;
  type: "unreplied_opportunity" | "potential_opportunity" | "manual";
  email_id: string;
  subject: string;
  from_name: string;
  from_email: string;
  received_at: string;
  ai_category: string | null;
  ai_summary: string | null;
  conversation_id: string | null;
  priority: "high" | "medium" | "low";
  reason: string;
  days_waiting: number;
  contact?: { first_name: string; last_name: string | null } | null;
  deal?: { title: string; stage: string; value: number | null } | null;
  suggested_action: string | null;
  due_date: string | null;
  manual_follow_up_id?: string;
}

/**
 * Smart follow-up system that:
 * 1. Surfaces unreplied "opportunity" emails
 * 2. Learns sender domains from categorized opportunities to detect potential ones
 * 3. Merges with manual follow-ups from email_follow_ups table
 */
export function useSmartFollowUps() {
  const { workspaceId } = useWorkspace();

  // 1. All inbox emails (non-sent, non-trash) with category info
  const { data: inboxEmails = [] } = useQuery({
    queryKey: ["smart-followup-inbox", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await q("inbox_emails")
        .select("id, subject, from_name, from_email, received_at, ai_category, ai_summary, conversation_id, contact_id, ai_intent, importance")
        .eq("workspace_id", workspaceId)
        .eq("folder", "inbox")
        .order("received_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });

  // 2. Sent email conversation_ids to detect replies
  const { data: repliedConvIds = new Set<string>() } = useQuery({
    queryKey: ["smart-followup-replied", workspaceId],
    queryFn: async (): Promise<Set<string>> => {
      if (!workspaceId) return new Set();
      const { data, error } = await q("inbox_emails")
        .select("conversation_id")
        .eq("workspace_id", workspaceId)
        .eq("folder", "sent")
        .not("conversation_id", "is", null);
      if (error) throw error;
      return new Set(
        ((data as any[]) ?? []).map((r: any) => r.conversation_id).filter(Boolean)
      );
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });

  // 3. Manual follow-ups
  const { data: manualFollowUps = [] } = useQuery({
    queryKey: ["smart-followup-manual", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await q("email_follow_ups")
        .select("*, inbox_emails(subject, from_name, from_email, received_at, ai_category, conversation_id), contacts(first_name, last_name), deals(title, stage, value)")
        .eq("workspace_id", workspaceId)
        .is("completed_at", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
    ...getFreshness("inbox"),
  });

  // 4. Contacts for enrichment
  const { data: contacts = [] } = useQuery({
    queryKey: ["smart-followup-contacts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, email, first_name, last_name")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
    ...getFreshness("contacts"),
  });

  // 5. Active deals for enrichment
  const { data: deals = [] } = useQuery({
    queryKey: ["smart-followup-deals", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, stage, value, contact_id")
        .eq("workspace_id", workspaceId)
        .in("stage", ["prospecting", "qualification", "proposal", "negotiation"]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
    ...getFreshness("deals"),
  });

  const smartItems = useMemo((): SmartFollowUpItem[] => {
    const now = Date.now();
    const manualEmailIds = new Set(manualFollowUps.map((f: any) => f.email_id).filter(Boolean));

    // Build contact/deal lookup
    const contactByEmail = new Map<string, { first_name: string; last_name: string | null }>();
    const contactIdByEmail = new Map<string, string>();
    for (const c of contacts) {
      if (c.email) {
        contactByEmail.set(c.email.toLowerCase(), { first_name: c.first_name, last_name: c.last_name });
        contactIdByEmail.set(c.email.toLowerCase(), c.id);
      }
    }
    const dealByContactId = new Map<string, { title: string; stage: string; value: number | null }>();
    for (const d of deals) {
      if (d.contact_id) dealByContactId.set(d.contact_id, { title: d.title, stage: d.stage, value: d.value });
    }

    // Learn opportunity sender domains from categorized emails
    const opportunityDomains = new Set<string>();
    const opportunitySenders = new Set<string>();
    for (const e of inboxEmails) {
      if (e.ai_category === "opportunity") {
        opportunitySenders.add(e.from_email.toLowerCase());
        const domain = e.from_email.split("@")[1]?.toLowerCase();
        if (domain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "protonmail.com", "mail.com"].includes(domain)) {
          opportunityDomains.add(domain);
        }
      }
    }

    const items: SmartFollowUpItem[] = [];

    // Process inbox emails for smart detection
    for (const email of inboxEmails) {
      const hasReplied = !!email.conversation_id && repliedConvIds.has(email.conversation_id);
      if (hasReplied) continue; // Already replied
      if (manualEmailIds.has(email.id)) continue; // Has manual follow-up

      const daysSince = Math.floor((now - new Date(email.received_at).getTime()) / 86400000);
      const senderDomain = email.from_email.split("@")[1]?.toLowerCase();
      const contactMatch = contactByEmail.get(email.from_email.toLowerCase()) ?? null;
      const contactId = contactIdByEmail.get(email.from_email.toLowerCase());
      const dealMatch = contactId ? dealByContactId.get(contactId) ?? null : null;

      const isOpportunity = email.ai_category === "opportunity";
      const isPotentialOpportunity = !isOpportunity &&
        !email.ai_category && // Uncategorized
        (opportunityDomains.has(senderDomain ?? "") || // Same domain as known opportunity
          (email.ai_intent && ["partnership", "sponsorship", "collaboration", "proposal"].some(k => email.ai_intent?.toLowerCase().includes(k))) ||
          dealMatch != null); // Has active deal

      if (!isOpportunity && !isPotentialOpportunity) continue;

      // Priority scoring
      let priority: "high" | "medium" | "low" = "medium";
      let reason = "Unreplied opportunity";

      if (isOpportunity) {
        if (daysSince >= 3) {
          priority = "high";
          reason = `Opportunity waiting ${daysSince}d`;
        } else if (daysSince >= 1) {
          reason = `Opportunity (${daysSince}d ago)`;
        } else {
          priority = "low";
          reason = "New opportunity";
        }
        if (dealMatch) {
          priority = "high";
          reason = `Deal: ${dealMatch.title} — ${daysSince}d no reply`;
        }
      } else {
        priority = "low";
        if (opportunityDomains.has(senderDomain ?? "")) {
          reason = "Sender domain matches known opportunities";
        } else if (dealMatch) {
          priority = "medium";
          reason = `Active deal contact — ${daysSince}d no reply`;
        } else {
          reason = "Potential opportunity (intent signals)";
        }
      }

      // Suggested action
      let suggested_action: string | null = null;
      if (daysSince >= 5) {
        suggested_action = "Reply urgently — risk losing opportunity";
      } else if (daysSince >= 2) {
        suggested_action = "Follow up to keep conversation active";
      } else {
        suggested_action = "Review and respond";
      }

      items.push({
        id: `smart-${email.id}`,
        type: isOpportunity ? "unreplied_opportunity" : "potential_opportunity",
        email_id: email.id,
        subject: email.subject,
        from_name: email.from_name,
        from_email: email.from_email,
        received_at: email.received_at,
        ai_category: email.ai_category,
        ai_summary: email.ai_summary,
        conversation_id: email.conversation_id,
        priority,
        reason,
        days_waiting: daysSince,
        contact: contactMatch,
        deal: dealMatch,
        suggested_action,
        due_date: null,
      });
    }

    // Add manual follow-ups
    for (const f of manualFollowUps) {
      const email = f.inbox_emails;
      items.push({
        id: `manual-${f.id}`,
        type: "manual",
        email_id: f.email_id ?? "",
        subject: email?.subject ?? f.suggested_action ?? "Follow up",
        from_name: email?.from_name ?? "",
        from_email: email?.from_email ?? "",
        received_at: email?.received_at ?? f.created_at,
        ai_category: email?.ai_category ?? null,
        ai_summary: null,
        conversation_id: email?.conversation_id ?? null,
        priority: f.priority ?? "medium",
        reason: f.reason ?? "Manual follow-up",
        days_waiting: Math.floor((now - new Date(f.created_at).getTime()) / 86400000),
        contact: f.contacts ? { first_name: f.contacts.first_name, last_name: f.contacts.last_name } : null,
        deal: f.deals ? { title: f.deals.title, stage: f.deals.stage, value: f.deals.value } : null,
        suggested_action: f.suggested_action,
        due_date: f.due_date,
        manual_follow_up_id: f.id,
      });
    }

    // Sort: high > medium > low, then by days_waiting desc
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    items.sort((a, b) => {
      const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pd !== 0) return pd;
      return b.days_waiting - a.days_waiting;
    });

    return items;
  }, [inboxEmails, repliedConvIds, manualFollowUps, contacts, deals]);

  return { data: smartItems, isLoading: false };
}
