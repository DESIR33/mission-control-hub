import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getGatedFreshness, getFreshness } from "@/config/data-freshness";
import { useEngagementGate } from "@/hooks/use-engagement-gate";
import { subDays, subMonths, startOfMonth, format } from "date-fns";
import { getDealAttributionDate } from "@/lib/deal-date-utils";

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
  const { canRefresh } = useEngagementGate();

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
    ...getGatedFreshness("dashboardStats", canRefresh),
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

      // Use server-side count queries instead of fetching all rows
      const contactStatuses = ["lead", "active", "customer", "inactive"];
      const videoStatuses = ["idea", "scripting", "recording", "editing", "scheduled"];
      const dealStages = ["prospecting", "qualification", "proposal", "negotiation", "closed_won"];

      const [contactCounts, videoCounts, dealCounts] = await Promise.all([
        Promise.all(
          contactStatuses.map((s) =>
            supabase
              .from("contacts")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .is("deleted_at", null)
              .eq("status", s)
              .then((r) => ({ status: s, count: r.count ?? 0 }))
          )
        ),
        Promise.all(
          videoStatuses.map((s) =>
            supabase
              .from("video_queue")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .eq("status", s)
              .then((r) => ({ status: s, count: r.count ?? 0 }))
          )
        ),
        Promise.all(
          dealStages.map((s) =>
            supabase
              .from("deals")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", workspaceId)
              .is("deleted_at", null)
              .eq("stage", s)
              .then((r) => ({ stage: s, count: r.count ?? 0 }))
          )
        ),
      ]);

      const cc = Object.fromEntries(contactCounts.map((c) => [c.status, c.count]));
      const vc = Object.fromEntries(videoCounts.map((v) => [v.status, v.count]));
      const dc = Object.fromEntries(dealCounts.map((d) => [d.stage, d.count]));

      const contactsPipeline: PipelineStage[] = [
        { label: "Lead", count: cc["lead"] ?? 0, color: "bg-primary" },
        { label: "Active", count: cc["active"] ?? 0, color: "bg-success" },
        { label: "Customer", count: cc["customer"] ?? 0, color: "bg-warning" },
        { label: "Inactive", count: cc["inactive"] ?? 0, color: "bg-destructive" },
      ];

      const contentPipeline: PipelineStage[] = [
        { label: "Idea", count: vc["idea"] ?? 0, color: "bg-muted-foreground" },
        { label: "Script", count: vc["scripting"] ?? 0, color: "bg-primary" },
        { label: "Recording", count: vc["recording"] ?? 0, color: "bg-warning" },
        { label: "Editing", count: vc["editing"] ?? 0, color: "bg-success" },
        { label: "Scheduled", count: vc["scheduled"] ?? 0, color: "bg-primary" },
      ];

      const dealsPipeline: PipelineStage[] = [
        { label: "Prospect", count: dc["prospecting"] ?? 0, color: "bg-muted-foreground" },
        { label: "Qualified", count: dc["qualification"] ?? 0, color: "bg-primary" },
        { label: "Proposal", count: dc["proposal"] ?? 0, color: "bg-primary" },
        { label: "Negotiation", count: dc["negotiation"] ?? 0, color: "bg-warning" },
        { label: "Won", count: dc["closed_won"] ?? 0, color: "bg-success" },
      ];

      return { contacts: contactsPipeline, content: contentPipeline, deals: dealsPipeline };
    },
    enabled: !!workspaceId,
    ...getFreshness("pipelineHealth"),
  });
}

export function useRevenueData() {
  const { workspaceId } = useWorkspace();
  const { canRefresh } = useEngagementGate();

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
          .select("value, closed_at, created_at, notes")
          .eq("workspace_id", workspaceId)
          .eq("stage", "closed_won")
          .is("deleted_at", null)
          .gte("created_at", cutoff)
          .limit(500),
        supabase
          .from("affiliate_transactions" as any)
          .select("amount, transaction_date")
          .eq("workspace_id", workspaceId)
          .gte("transaction_date", cutoff)
          .limit(500),
        supabase
          .from("youtube_channel_analytics" as any)
          .select("date, estimated_revenue")
          .eq("workspace_id", workspaceId)
          .gte("date", cutoff)
          .limit(500),
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
          const dealDate = getDealAttributionDate(d);
          if (dealDate && dealDate.startsWith(monthStr)) {
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
    ...getGatedFreshness("dashboardStats", canRefresh),
  });
}

export function useNeedsAttention() {
  const { workspaceId } = useWorkspace();
  const { canRefresh } = useEngagementGate();

  return useQuery({
    queryKey: ["needs-attention", workspaceId],
    queryFn: async (): Promise<AttentionItem[]> => {
      if (!workspaceId) return [];

      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const [
        { data: staleContacts },
        { data: pendingProposals },
        { data: urgentDeals },
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select("first_name, last_name, last_contact_date")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .not("last_contact_date", "is", null)
          .lt("last_contact_date", sevenDaysAgo)
          .limit(3),
        supabase
          .from("ai_proposals")
          .select("title")
          .eq("workspace_id", workspaceId)
          .eq("status", "pending")
          .limit(3),
        supabase
          .from("deals")
          .select("title, expected_close_date")
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .in("stage", ["prospecting", "qualification", "proposal", "negotiation"])
          .lte("expected_close_date", nextWeek.toISOString().split("T")[0])
          .limit(3),
      ]);

      const items: AttentionItem[] = [];

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

      for (const p of pendingProposals ?? []) {
        items.push({
          title: p.title,
          subtitle: "Awaiting your approval",
          type: "approval",
          urgency: "medium",
        });
      }

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
    ...getGatedFreshness("dashboardStats", canRefresh),
  });
}

export function useAiBriefing() {
  const { workspaceId } = useWorkspace();
  const { canRefresh } = useEngagementGate();

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

      const [
        { count: staleCount },
        { data: proposals },
        { data: negDeals },
        { count: reviewCount },
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .is("deleted_at", null)
          .not("last_contact_date", "is", null)
          .lt("last_contact_date", sevenDaysAgo),
        supabase
          .from("ai_proposals")
          .select("title, type")
          .eq("workspace_id", workspaceId)
          .eq("status", "pending")
          .limit(2),
        supabase
          .from("deals")
          .select("title, value")
          .eq("workspace_id", workspaceId)
          .eq("stage", "negotiation")
          .is("deleted_at", null)
          .limit(2),
        supabase
          .from("video_queue")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .in("status", ["editing", "review"]),
      ]);

      if (staleCount && staleCount > 0) {
        items.push({
          type: "insight",
          text: `${staleCount} contact${staleCount > 1 ? "s" : ""} haven't been followed up in 7+ days — potential revenue at risk.`,
        });
      }

      for (const p of proposals ?? []) {
        items.push({
          type: "action",
          text: `Review AI proposal: "${p.title}". Awaiting your approval.`,
        });
      }

      for (const d of negDeals ?? []) {
        items.push({
          type: "insight",
          text: `"${d.title}" is in negotiation${d.value ? ` (value: $${d.value.toLocaleString()})` : ""}. Consider scheduling a follow-up.`,
        });
      }

      if (reviewCount && reviewCount > 0) {
        items.push({
          type: "action",
          text: `${reviewCount} video${reviewCount > 1 ? "s" : ""} in editing/review — ready for your sign-off.`,
        });
      }

      // YouTube Performance Intelligence + stale deals (parallelized)
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split("T")[0];
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];
      const fiveDaysAgo = subDays(new Date(), 5).toISOString();

      const [
        { data: recentVideos },
        { data: monthlyAdData },
        { data: staleDeals },
      ] = await Promise.all([
        supabase
          .from("youtube_video_analytics" as any)
          .select("title, impressions_ctr, views, subscribers_gained, estimated_revenue, youtube_video_id")
          .eq("workspace_id", workspaceId)
          .gte("date", fourteenDaysAgo)
          .order("date", { ascending: false })
          .limit(5),
        supabase
          .from("youtube_video_analytics" as any)
          .select("estimated_revenue")
          .eq("workspace_id", workspaceId)
          .gte("date", thirtyDaysAgo)
          .limit(500),
        supabase
          .from("deals")
          .select("title, updated_at")
          .eq("workspace_id", workspaceId)
          .in("stage", ["proposal", "negotiation"])
          .is("deleted_at", null)
          .lt("updated_at", fiveDaysAgo)
          .limit(2),
      ]);

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

      if (monthlyAdData) {
        const monthlyRevenue = monthlyAdData.reduce((s: number, r: any) => s + (Number(r.estimated_revenue) || 0), 0);
        if (monthlyRevenue >= 1000) {
          items.push({ type: "insight", text: `YouTube ad revenue hit $${monthlyRevenue.toFixed(0)} this month!` });
        } else if (monthlyRevenue >= 500) {
          items.push({ type: "insight", text: `YouTube ad revenue at $${monthlyRevenue.toFixed(0)} this month — on track!` });
        }
      }

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
    ...getGatedFreshness("dashboardStats", canRefresh),
  });
}
