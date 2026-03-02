import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export interface TimelineEvent {
  id: string;
  type: "activity" | "email" | "deal_change" | "proposal" | "youtube_lead" | "note";
  title: string;
  description: string | null;
  timestamp: string;
  icon: string; // icon name from lucide
  color: string; // tailwind color class
  metadata?: Record<string, unknown>;
}

export function useUnifiedTimeline(contactId: string | null) {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["unified-timeline", workspaceId, contactId],
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!workspaceId || !contactId) return [];

      const events: TimelineEvent[] = [];

      // 1. Manual activities
      const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("entity_id", contactId)
        .eq("entity_type", "contact")
        .order("performed_at", { ascending: false })
        .limit(50);

      for (const a of activities ?? []) {
        events.push({
          id: a.id,
          type: "activity",
          title: a.title || a.activity_type,
          description: a.description,
          timestamp: a.performed_at,
          icon:
            a.activity_type === "call"
              ? "Phone"
              : a.activity_type === "meeting"
                ? "Calendar"
                : a.activity_type === "email"
                  ? "Mail"
                  : "MessageSquare",
          color: "text-blue-500",
        });
      }

      // 2. Deal stage changes for deals linked to this contact
      const { data: contactDeals } = await supabase
        .from("deals")
        .select("id, title")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .is("deleted_at", null);

      if (contactDeals?.length) {
        const dealIds = contactDeals.map((d) => d.id);
        const { data: stageChanges } = await supabase
          .from("deal_stage_history" as any)
          .select("*")
          .eq("workspace_id", workspaceId)
          .in("deal_id", dealIds)
          .order("changed_at", { ascending: false });

        for (const sc of (stageChanges ?? []) as any[]) {
          const dealTitle =
            contactDeals.find((d) => d.id === sc.deal_id)?.title || "Deal";
          events.push({
            id: sc.id,
            type: "deal_change",
            title: `${dealTitle}: ${sc.from_stage || "new"} \u2192 ${sc.to_stage}`,
            description: null,
            timestamp: sc.changed_at,
            icon: "TrendingUp",
            color:
              sc.to_stage === "closed_won"
                ? "text-green-500"
                : sc.to_stage === "closed_lost"
                  ? "text-red-500"
                  : "text-purple-500",
          });
        }
      }

      // 3. AI proposals for this contact
      const { data: proposals } = await supabase
        .from("ai_proposals")
        .select("id, title, status, created_at, type")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const p of proposals ?? []) {
        events.push({
          id: p.id,
          type: "proposal",
          title: `AI Proposal: ${p.title}`,
          description: `Status: ${p.status}`,
          timestamp: p.created_at,
          icon: "Brain",
          color:
            p.status === "approved"
              ? "text-green-500"
              : p.status === "rejected"
                ? "text-red-500"
                : "text-yellow-500",
        });
      }

      // 4. YouTube lead comments linked to this contact
      const { data: leadComments } = await supabase
        .from("youtube_lead_comments" as any)
        .select(
          "id, comment_text, video_title, detected_intent, created_at"
        )
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(10);

      for (const lc of (leadComments ?? []) as any[]) {
        events.push({
          id: lc.id,
          type: "youtube_lead",
          title: `YouTube comment on "${lc.video_title || "video"}"`,
          description: lc.comment_text?.substring(0, 150) || null,
          timestamp: lc.created_at,
          icon: "Youtube",
          color: "text-red-500",
          metadata: { intent: lc.detected_intent },
        });
      }

      // Sort all events by timestamp descending
      events.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return events;
    },
    enabled: !!workspaceId && !!contactId,
  });
}
