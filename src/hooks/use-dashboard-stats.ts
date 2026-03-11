import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { subDays, subMonths, startOfMonth, format } from "date-fns";

export interface DashboardStats {
  contactCount: number;
  activeContactCount: number;
  pipelineValue: number;
  closingThisWeek: number;
  contentInPipeline: number;
  contentInEditing: number;
  pendingProposals: number;
  totalDeals: number;
}

export interface RevenueDataPoint {
  month: string;
  amount: number;
}

export interface PipelineStage {
  label: string;
  count: number;
  color: string;
}

export interface AttentionItem {
  title: string;
  subtitle: string;
  type: "overdue" | "follow-up" | "approval" | "deadline";
  urgency: "high" | "medium" | "low";
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
      if (!workspaceId) {
        return {
          contactCount: 0,
          activeContactCount: 0,
          pipelineValue: 0,
          closingThisWeek: 0,
          contentInPipeline: 0,
          contentInEditing: 0,
          pendingProposals: 0,
          totalDeals: 0,
        };
      }

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const [
        contactCountRes,
        activeContactCountRes,
        totalDealsRes,
        pipelineDealsRes,
        closingDealsRes,
        contentPipelineRes,
        contentEditingRes,
        proposalsRes,
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null),
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .eq("status", "active"),
        supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null),
        supabase
          .from("deals")
          .select("value")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .in("stage", ["prospecting", "qualification", "proposal", "negotiation"]),
        supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .in("stage", ["prospecting", "qualification", "proposal", "negotiation"])
          .lte("expected_close_date", nextWeek.toISOString().split("T")[0]),
        supabase
          .from("video_queue")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("status", ["idea", "scripting", "recording", "editing", "review", "scheduled"]),
        supabase
          .from("video_queue")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("status", ["editing", "review"]),
        supabase
          .from("ai_proposals")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("status", "pending"),
      ]);

      const pipelineValue = (pipelineDealsRes.data ?? []).reduce(
        (sum: number, d: any) => sum + (d.value ?? 0), 0
      );

      return {
        contactCount: contactCountRes.count ?? 0,
        activeContactCount: activeContactCountRes.count ?? 0,
        pipelineValue,
        closingThisWeek: closingDealsRes.count ?? 0,
        contentInPipeline: contentPipelineRes.count ?? 0,
        contentInEditing: contentEditingRes.count ?? 0,
        pendingProposals: proposalsRes.count ?? 0,
        totalDeals: totalDealsRes.count ?? 0,
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 300_000,
    staleTime: 120_000,
  });
}

export function usePipelineHealth() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["pipeline-health", workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return { contacts: [], content: [], deals: [] };
      }

      const [contactsRes, videosRes, dealsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("status")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null),
        supabase
          .from("video_queue")
          .select("status")
          .eq("workspace_id", workspaceId),
        supabase
          .from("deals")
          .select("stage")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null),
      ]);

      const contacts = contactsRes.data ?? [];
      const videos = videosRes.data ?? [];
      const deals = dealsRes.data ?? [];

      const countBy = <T extends Record<string, unknown>>(arr: T[], key: keyof T) => {
        const counts: Record<string, number> = {};
        for (const item of arr) {
          const val = String(item[key]);
          counts[val] = (counts[val] ?? 0) + 1;
        }
        return counts;
      };

      const contactCounts = countBy(contacts, "status");
      const videoCounts = countBy(videos, "status");
      const dealCounts = countBy(deals, "stage");

      const contactsPipeline: PipelineStage[] = [
        { label: "Lead", count: contactCounts["lead"] ?? 0, color: "bg-primary" },
        { label: "Active", count: contactCounts["active"] ?? 0, color: "bg-success" },
        { label: "Customer", count: contactCounts["customer"] ?? 0, color: "bg-warning" },
        { label: "Inactive", count: contactCounts["inactive"] ?? 0, color: "bg-destructive" },
      ];

      const contentPipeline: PipelineStage[] = [
        { label: "Idea", count: videoCounts["idea"] ?? 0, color: "bg-muted-foreground" },
        { label: "Script", count: videoCounts["scripting"] ?? 0, color: "bg-primary" },
        { label: "Recording", count: videoCounts["recording"] ?? 0, color: "bg-warning" },
        { label: "Editing", count: videoCounts["editing"] ?? 0, color: "bg-success" },
        { label: "Scheduled", count: videoCounts["scheduled"] ?? 0, color: "bg-primary" },
      ];

      const dealsPipeline: PipelineStage[] = [
        { label: "Prospect", count: dealCounts["prospecting"] ?? 0, color: "bg-muted-foreground" },
        { label: "Qualified", count: dealCounts["qualification"] ?? 0, color: "bg-primary" },
        { label: "Proposal", count: dealCounts["proposal"] ?? 0, color: "bg-primary" },
        { label: "Negotiation", count: dealCounts["negotiation"] ?? 0, color: "bg-warning" },
        { label: "Won", count: dealCounts["closed_won"] ?? 0, color: "bg-success" },
      ];

      return { contacts: contactsPipeline, content: contentPipeline, deals: dealsPipeline };
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

export function useRevenueData() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["revenue-data", workspaceId],
    queryFn: async (): Promise<{ monthly: RevenueDataPoint[]; sponsors: number; affiliates: number; ads: number }> => {
      if (!workspaceId) {
        return { monthly: [], sponsors: 0, affiliates: 0, ads: 0 };
      }

      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
      const cutoff = format(sixMonthsAgo, "yyyy-MM-dd");

      const [wonDealsRes, affiliateTxRes, adRevenueRes] = await Promise.all([
        supabase
          .from("deals")
          .select("value, closed_at")
          .eq("workspace_id", workspaceId)
          .eq("stage", "closed_won")
          .is("deleted_at", null),
        supabase
          .from("affiliate_transactions" as any)
          .select("amount, transaction_date")
          .eq("workspace_id", workspaceId),
        supabase
          .from("youtube_channel_analytics" as any)
          .select("date, estimated_revenue")
          .eq("workspace_id", workspaceId)
          .gte("date", cutoff),
      ]);

      const deals = wonDealsRes.data ?? [];
      const transactions = (affiliateTxRes.data ?? []) as unknown as Array<{ amount: number; transaction_date: string }>;
      const adRows = (adRevenueRes.data ?? []) as unknown as Array<{ date: string; estimated_revenue: number }>;

      const months: RevenueDataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthLabel = format(monthStart, "MMM");
        const monthStr = format(monthStart, "yyyy-MM");

        let amount = 0;
        for (const d of deals) {
          if (d.closed_at && d.closed_at.startsWith(monthStr)) {
            amount += d.value ?? 0;
          }
        }
        for (const t of transactions) {
          if (t.transaction_date && t.transaction_date.startsWith(monthStr)) {
            amount += t.amount ?? 0;
          }
        }
        for (const a of adRows) {
          if (a.date && a.date.startsWith(monthStr)) {
            amount += Number(a.estimated_revenue) || 0;
          }
        }

        months.push({ month: monthLabel, amount });
      }

      const sponsorTotal = deals.reduce((s, d) => s + (d.value ?? 0), 0);
      const affiliateTotal = transactions.reduce((s, t) => s + (t.amount ?? 0), 0);
      const adTotal = adRows.reduce((s, a) => s + (Number(a.estimated_revenue) || 0), 0);

      return {
        monthly: months,
        sponsors: sponsorTotal,
        affiliates: affiliateTotal,
        ads: adTotal,
      };
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

export function useNeedsAttention() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["needs-attention", workspaceId],
    queryFn: async (): Promise<AttentionItem[]> => {
      if (!workspaceId) return [];

      const items: AttentionItem[] = [];
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const { data: staleContacts } = await supabase
        .from("contacts")
        .select("first_name, last_name, last_contact_date")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .not("last_contact_date", "is", null)
        .lt("last_contact_date", sevenDaysAgo)
        .limit(3);

      for (const c of staleContacts ?? []) {
        const daysSince = c.last_contact_date
          ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        items.push({
          title: `${c.first_name} ${c.last_name ?? ""}`.trim(),
          subtitle: `No contact in ${daysSince} days`,
          type: "follow-up",
          urgency: daysSince > 14 ? "high" : "medium",
        });
      }

      const { data: pendingProposals } = await supabase
        .from("ai_proposals")
        .select("title")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .limit(3);

      for (const p of pendingProposals ?? []) {
        items.push({
          title: p.title,
          subtitle: "Awaiting your approval",
          type: "approval",
          urgency: "medium",
        });
      }

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const { data: urgentDeals } = await supabase
        .from("deals")
        .select("title, expected_close_date")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .in("stage", ["prospecting", "qualification", "proposal", "negotiation"])
        .lte("expected_close_date", nextWeek.toISOString().split("T")[0])
        .limit(3);

      for (const d of urgentDeals ?? []) {
        items.push({
          title: d.title,
          subtitle: `Close date: ${format(new Date(d.expected_close_date!), "MMM d")}`,
          type: "deadline",
          urgency: "high",
        });
      }

      return items.slice(0, 5);
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
}

export function useAiBriefing() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: ["ai-briefing", workspaceId],
    queryFn: async (): Promise<BriefingItem[]> => {
      if (!workspaceId) return [];

      const items: BriefingItem[] = [];
      const today = format(new Date(), "yyyy-MM-dd");

      // First, check for a stored AI-generated daily briefing
      const { data: storedBriefing } = await supabase
        .from("assistant_daily_logs")
        .select("content")
        .eq("workspace_id", workspaceId)
        .eq("source", "daily-briefing")
        .eq("log_date", today)
        .order("created_at", { ascending: false })
        .limit(1);

      if (storedBriefing && storedBriefing.length > 0) {
        const lines = storedBriefing[0].content.split("\n").filter((l: string) => l.trim());
        for (const line of lines) {
          const trimmed = line.replace(/^[-•]\s*/, "").trim();
          if (!trimmed) continue;
          const isAction = trimmed.startsWith("🔴") || trimmed.startsWith("🟡");
          items.push({
            type: isAction ? "action" : "insight",
            text: trimmed,
          });
        }
        return items.slice(0, 8);
      }

      // Fallback: generate client-side briefing from live data
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const { count: staleCount } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .not("last_contact_date", "is", null)
        .lt("last_contact_date", sevenDaysAgo);

      if (staleCount && staleCount > 0) {
        items.push({
          type: "insight",
          text: `${staleCount} contact${staleCount > 1 ? "s" : ""} haven't been followed up in 7+ days — potential revenue at risk.`,
        });
      }

      const { data: proposals } = await supabase
        .from("ai_proposals")
        .select("title, type")
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .limit(2);

      for (const p of proposals ?? []) {
        items.push({
          type: "action",
          text: `Review AI proposal: "${p.title}". Awaiting your approval.`,
        });
      }

      const { data: negDeals } = await supabase
        .from("deals")
        .select("title, value")
        .eq("workspace_id", workspaceId)
        .eq("stage", "negotiation")
        .is("deleted_at", null)
        .limit(2);

      for (const d of negDeals ?? []) {
        items.push({
          type: "insight",
          text: `"${d.title}" is in negotiation${d.value ? ` (value: $${d.value.toLocaleString()})` : ""}. Consider scheduling a follow-up.`,
        });
      }

      const { count: reviewCount } = await supabase
        .from("video_queue")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["editing", "review"]);

      if (reviewCount && reviewCount > 0) {
        items.push({
          type: "action",
          text: `${reviewCount} video${reviewCount > 1 ? "s" : ""} in editing/review — ready for your sign-off.`,
        });
      }

      // YouTube Performance Intelligence
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split("T")[0];
      const fiveDaysAgo = subDays(new Date(), 5).toISOString();

      const { data: recentVideos } = await supabase
        .from("youtube_video_analytics" as any)
        .select("title, impressions_ctr, views, subscribers_gained, estimated_revenue, youtube_video_id")
        .eq("workspace_id", workspaceId)
        .gte("date", fourteenDaysAgo)
        .order("date", { ascending: false })
        .limit(5);

      if (recentVideos && recentVideos.length > 0) {
        const latest = recentVideos[0] as any;
        if (latest.impressions_ctr > 0 && latest.impressions_ctr < 0.04) {
          items.push({
            type: "action",
            text: `Your latest video has ${(latest.impressions_ctr * 100).toFixed(1)}% CTR — below average. Test a new thumbnail today.`,
          });
        }

        const bestSubVideo = recentVideos.reduce((best: any, v: any) =>
          (v.subscribers_gained > (best?.subscribers_gained ?? 0)) ? v : best, null);
        if (bestSubVideo && bestSubVideo.subscribers_gained > 100) {
          items.push({
            type: "insight",
            text: `"${bestSubVideo.title}" converted ${bestSubVideo.subscribers_gained} subscribers — study what made this effective.`,
          });
        }
      }

      // Monthly ad revenue
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];
      const { data: monthlyAdData } = await supabase
        .from("youtube_video_analytics" as any)
        .select("estimated_revenue")
        .eq("workspace_id", workspaceId)
        .gte("date", thirtyDaysAgo);

      if (monthlyAdData) {
        const monthlyRevenue = monthlyAdData.reduce((s: number, r: any) => s + (Number(r.estimated_revenue) || 0), 0);
        if (monthlyRevenue >= 1000) {
          items.push({ type: "insight", text: `YouTube ad revenue hit $${monthlyRevenue.toFixed(0)} this month!` });
        } else if (monthlyRevenue >= 500) {
          items.push({ type: "insight", text: `YouTube ad revenue at $${monthlyRevenue.toFixed(0)} this month — on track!` });
        }
      }

      // Stale sponsor follow-up
      const { data: staleDeals } = await supabase
        .from("deals")
        .select("title, updated_at")
        .eq("workspace_id", workspaceId)
        .in("stage", ["proposal", "negotiation"])
        .is("deleted_at", null)
        .lt("updated_at", fiveDaysAgo)
        .limit(2);

      for (const d of staleDeals ?? []) {
        const daysSince = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        items.push({
          type: "action",
          text: `Deal "${d.title}" hasn't been updated in ${daysSince} days — follow up before it goes cold.`,
        });
      }

      return items.length > 0
        ? items.slice(0, 7)
        : [{ type: "insight", text: "All caught up! No urgent items right now." }];
    },
    enabled: !!workspaceId,
    staleTime: 300_000,
  });
}
