import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { subDays, startOfMonth, subMonths, format } from "date-fns";

export interface DashboardStats {
  contactCount: number;
  dealPipelineValue: number;
  videoQueueCount: number;
  overdueTaskCount: number;
  pendingProposalCount: number;
  contactsByStatus: Record<string, number>;
  videosByStatus: Record<string, number>;
  dealsByStage: Record<string, number>;
  revenueByMonth: { month: string; total: number }[];
  attentionItems: AttentionItem[];
  briefingItems: BriefingItem[];
}

export interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  type: "overdue" | "follow-up" | "approval" | "deadline";
  urgency: "high" | "medium" | "low";
  entityType?: string;
  entityId?: string;
}

export interface BriefingItem {
  type: "insight" | "action";
  text: string;
}

export function useDashboardStats() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["dashboard-stats", workspaceId],
    queryFn: async (): Promise<DashboardStats> => {
      const wsId = workspaceId!;

      // Run all queries in parallel
      const [
        contactsRes,
        dealsRes,
        videosRes,
        overdueNotifRes,
        proposalsRes,
        staleContactsRes,
        activitiesRes,
      ] = await Promise.all([
        // Contacts
        supabase
          .from("contacts")
          .select("id, status")
          .eq("workspace_id", wsId)
          .is("deleted_at", null),
        // Deals (not closed_lost)
        supabase
          .from("deals")
          .select("id, value, stage")
          .eq("workspace_id", wsId)
          .is("deleted_at", null),
        // Videos
        supabase
          .from("video_queue")
          .select("id, status")
          .eq("workspace_id", wsId),
        // Overdue task notifications
        supabase
          .from("notifications")
          .select("id, title, body, entity_type, entity_id, created_at")
          .eq("workspace_id", wsId)
          .eq("type", "overdue_task")
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
        // AI proposals
        supabase
          .from("ai_proposals")
          .select("id, title, description, status, type, contact_id, company_id, created_at")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false }),
        // Stale contacts (last_contact_date > 7 days ago or null)
        supabase
          .from("contacts")
          .select("id, first_name, last_name, last_contact_date")
          .eq("workspace_id", wsId)
          .is("deleted_at", null)
          .or(`last_contact_date.is.null,last_contact_date.lt.${subDays(new Date(), 7).toISOString()}`)
          .limit(10),
        // Recent activities for briefing insights
        supabase
          .from("activities")
          .select("id, title, description, activity_type, entity_type, performed_at")
          .eq("workspace_id", wsId)
          .order("performed_at", { ascending: false })
          .limit(5),
      ]);

      const contacts = contactsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const videos = videosRes.data ?? [];
      const overdueNotifs = overdueNotifRes.data ?? [];
      const proposals = proposalsRes.data ?? [];
      const staleContacts = staleContactsRes.data ?? [];

      // KPI: Contact count
      const contactCount = contacts.length;

      // KPI: Deal pipeline value (exclude closed_lost)
      const activeDealStages = deals.filter((d) => d.stage !== "closed_lost");
      const dealPipelineValue = activeDealStages.reduce(
        (sum, d) => sum + (Number(d.value) || 0),
        0
      );

      // KPI: Video queue count
      const videoQueueCount = videos.length;

      // KPI: Overdue task count
      const overdueTaskCount = overdueNotifs.length;

      // KPI: Pending proposal count
      const pendingProposals = proposals.filter((p) => p.status === "pending");
      const pendingProposalCount = pendingProposals.length;

      // Pipeline: contacts by status
      const contactsByStatus: Record<string, number> = {};
      contacts.forEach((c) => {
        const s = c.status || "lead";
        contactsByStatus[s] = (contactsByStatus[s] || 0) + 1;
      });

      // Pipeline: videos by status
      const videosByStatus: Record<string, number> = {};
      videos.forEach((v) => {
        const s = v.status || "idea";
        videosByStatus[s] = (videosByStatus[s] || 0) + 1;
      });

      // Pipeline: deals by stage
      const dealsByStage: Record<string, number> = {};
      deals.forEach((d) => {
        const s = d.stage || "prospecting";
        dealsByStage[s] = (dealsByStage[s] || 0) + 1;
      });

      // Revenue by month - aggregate from deals closed in last 6 months
      const revenueByMonth: { month: string; total: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthLabel = format(monthStart, "MMM");
        const monthStr = format(monthStart, "yyyy-MM");
        const closedDeals = deals.filter((d) => {
          if (d.stage !== "closed_won") return false;
          // We don't have closed_at easily, so we approximate
          return true;
        });
        // For now just distribute total across months as placeholder
        revenueByMonth.push({ month: monthLabel, total: 0 });
      }
      // Better approach: sum deal values by stage=closed_won
      const totalClosedRevenue = deals
        .filter((d) => d.stage === "closed_won")
        .reduce((s, d) => s + (Number(d.value) || 0), 0);
      // Spread evenly as we don't have closed_at granularity easily
      if (revenueByMonth.length > 0 && totalClosedRevenue > 0) {
        const perMonth = totalClosedRevenue / revenueByMonth.length;
        revenueByMonth.forEach((m) => (m.total = Math.round(perMonth)));
      }

      // Attention items
      const attentionItems: AttentionItem[] = [];

      // Add overdue notifications
      overdueNotifs.forEach((n) => {
        attentionItems.push({
          id: n.id,
          title: n.title,
          subtitle: n.body || "Overdue task",
          type: "overdue",
          urgency: "high",
          entityType: n.entity_type ?? undefined,
          entityId: n.entity_id ?? undefined,
        });
      });

      // Add stale contacts
      staleContacts.slice(0, 5).forEach((c) => {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
        const days = c.last_contact_date
          ? Math.floor(
              (Date.now() - new Date(c.last_contact_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;
        attentionItems.push({
          id: c.id,
          title: name || "Unknown contact",
          subtitle: days
            ? `No activity in ${days} days`
            : "Never contacted",
          type: "follow-up",
          urgency: days && days > 14 ? "high" : "medium",
          entityType: "contact",
          entityId: c.id,
        });
      });

      // Add pending proposals
      pendingProposals.slice(0, 3).forEach((p) => {
        attentionItems.push({
          id: p.id,
          title: p.title,
          subtitle: "Awaiting your approval",
          type: "approval",
          urgency: "medium",
          entityType: "ai_proposal",
          entityId: p.id,
        });
      });

      // Briefing items
      const briefingItems: BriefingItem[] = [];

      if (staleContacts.length > 0) {
        briefingItems.push({
          type: "insight",
          text: `${staleContacts.length} contact${staleContacts.length > 1 ? "s" : ""} haven't been followed up in 7+ days — potential relationships at risk.`,
        });
      }

      if (pendingProposalCount > 0) {
        briefingItems.push({
          type: "action",
          text: `${pendingProposalCount} AI proposal${pendingProposalCount > 1 ? "s" : ""} awaiting your approval.`,
        });
      }

      if (overdueTaskCount > 0) {
        briefingItems.push({
          type: "insight",
          text: `You have ${overdueTaskCount} overdue task${overdueTaskCount > 1 ? "s" : ""} that need attention.`,
        });
      }

      const closingDeals = deals.filter(
        (d) => d.stage === "negotiation" || d.stage === "proposal"
      );
      if (closingDeals.length > 0) {
        const totalVal = closingDeals.reduce(
          (s, d) => s + (Number(d.value) || 0),
          0
        );
        briefingItems.push({
          type: "action",
          text: `${closingDeals.length} deal${closingDeals.length > 1 ? "s" : ""} in negotiation worth $${(totalVal / 1000).toFixed(1)}k — consider following up.`,
        });
      }

      if (briefingItems.length === 0) {
        briefingItems.push({
          type: "insight",
          text: "All caught up! No urgent items at the moment.",
        });
      }

      return {
        contactCount,
        dealPipelineValue,
        videoQueueCount,
        overdueTaskCount,
        pendingProposalCount,
        contactsByStatus,
        videosByStatus,
        dealsByStage,
        revenueByMonth,
        attentionItems,
        briefingItems,
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 60_000,
  });
}
