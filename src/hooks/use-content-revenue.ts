import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";
import { useVideoAnalytics } from "@/hooks/use-youtube-analytics-api";

export interface ContentRevenueLink {
  videoTitle: string;
  videoQueueId: number;
  youtubeVideoId?: string;
  adRevenue: number;
  dealRevenue: number;
  affiliateRevenue: number;
  totalRevenue: number;
  views: number;
  revenuePerView: number;
  roi: number;
}

export interface ContentRevenueSummary {
  links: ContentRevenueLink[];
  totalAdRevenue: number;
  totalDealRevenue: number;
  totalAffiliateRevenue: number;
  grandTotal: number;
  avgRevenuePerVideo: number;
  topEarner: ContentRevenueLink | null;
  revenueBySource: { source: string; amount: number }[];
}

export function useContentRevenue(days = 180) {
  const { workspaceId } = useWorkspace();
  const { data: videoAnalytics = [] } = useVideoAnalytics(days);

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["content-revenue-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals" as any)
        .select("id, title, value, stage, company_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: affiliateTxns = [], isLoading: affLoading } = useQuery({
    queryKey: ["content-revenue-affiliates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_transactions" as any)
        .select("id, amount, video_queue_id, status")
        .eq("workspace_id", workspaceId!)
        .not("video_queue_id", "is", null);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ["content-revenue-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue" as any)
        .select("id, title, youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  // Fetch video_companies to link deals to videos via company_id
  const { data: videoCompanies = [] } = useQuery({
    queryKey: ["content-revenue-vc", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_companies")
        .select("company_id, youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const summary = useMemo((): ContentRevenueSummary | null => {
    // Build a unified map of all videos keyed by youtube_video_id
    // Sources: video_queue (has queue id + optional yt id) and video_analytics (has yt id + title)
    const videoMap = new Map<string, {
      videoTitle: string;
      videoQueueId: number;
      youtubeVideoId: string;
      adRevenue: number;
      dealRevenue: number;
      affiliateRevenue: number;
      views: number;
    }>();

    // Index video_queue by youtube_video_id for lookups
    const queueByYtId = new Map<string, any>();
    const queueById = new Map<string, any>();
    for (const vq of videoQueue) {
      queueById.set(String(vq.id), vq);
      if (vq.youtube_video_id) {
        queueByYtId.set(vq.youtube_video_id, vq);
      }
    }

    // 1) Seed from video_analytics (primary source of ad revenue + views)
    for (const va of videoAnalytics) {
      const ytId = va.youtube_video_id;
      const existing = videoMap.get(ytId);
      const queueEntry = queueByYtId.get(ytId);
      if (existing) {
        existing.adRevenue += va.estimated_revenue || 0;
        existing.views += va.views || 0;
        // Prefer queue title if available
        if (queueEntry && !existing.videoTitle) {
          existing.videoTitle = queueEntry.title;
        }
      } else {
        videoMap.set(ytId, {
          videoTitle: queueEntry?.title || va.title || "Untitled Video",
          videoQueueId: queueEntry ? Number(queueEntry.id) : 0,
          youtubeVideoId: ytId,
          adRevenue: va.estimated_revenue || 0,
          dealRevenue: 0,
          affiliateRevenue: 0,
          views: va.views || 0,
        });
      }
    }

    // 2) Also seed from video_queue entries that have no analytics yet
    for (const vq of videoQueue) {
      if (vq.youtube_video_id && !videoMap.has(vq.youtube_video_id)) {
        videoMap.set(vq.youtube_video_id, {
          videoTitle: vq.title,
          videoQueueId: Number(vq.id),
          youtubeVideoId: vq.youtube_video_id,
          adRevenue: 0,
          dealRevenue: 0,
          affiliateRevenue: 0,
          views: 0,
        });
      }
    }

    if (videoMap.size === 0) return null;

    // 3) Map youtube_video_id -> company_ids for linking deals
    const videoToCompanies = new Map<string, Set<string>>();
    for (const vc of videoCompanies) {
      const set = videoToCompanies.get(vc.youtube_video_id) ?? new Set();
      set.add(vc.company_id);
      videoToCompanies.set(vc.youtube_video_id, set);
    }

    // 4) Attribute deal revenue via video_companies
    for (const [ytId, entry] of videoMap) {
      const linkedCompanyIds = videoToCompanies.get(ytId);
      if (linkedCompanyIds) {
        entry.dealRevenue = deals
          .filter((d: any) => d.stage === "closed_won" && d.company_id && linkedCompanyIds.has(d.company_id))
          .reduce((s: number, d: any) => s + (Number(d.value) || 0), 0);
      }
    }

    // 5) Attribute affiliate revenue via video_queue_id
    for (const txn of affiliateTxns) {
      if (txn.status === "cancelled") continue;
      const queueEntry = queueById.get(String(txn.video_queue_id));
      if (queueEntry?.youtube_video_id && videoMap.has(queueEntry.youtube_video_id)) {
        videoMap.get(queueEntry.youtube_video_id)!.affiliateRevenue += Number(txn.amount) || 0;
      }
    }

    // 6) Build final links
    const links: ContentRevenueLink[] = Array.from(videoMap.values()).map((entry) => {
      const totalRevenue = entry.adRevenue + entry.dealRevenue + entry.affiliateRevenue;
      return {
        videoTitle: entry.videoTitle,
        videoQueueId: entry.videoQueueId,
        youtubeVideoId: entry.youtubeVideoId,
        adRevenue: entry.adRevenue,
        dealRevenue: entry.dealRevenue,
        affiliateRevenue: entry.affiliateRevenue,
        totalRevenue,
        views: entry.views,
        revenuePerView: entry.views > 0 ? totalRevenue / entry.views : 0,
        roi: 0,
      };
    });

    links.sort((a, b) => b.totalRevenue - a.totalRevenue);
    const withRevenue = links.filter((l) => l.totalRevenue > 0);

    const totalAdRevenue = withRevenue.reduce((s, l) => s + l.adRevenue, 0);
    const totalDealRevenue = withRevenue.reduce((s, l) => s + l.dealRevenue, 0);
    const totalAffiliateRevenue = withRevenue.reduce((s, l) => s + l.affiliateRevenue, 0);
    const grandTotal = totalAdRevenue + totalDealRevenue + totalAffiliateRevenue;

    return {
      links: withRevenue.slice(0, 50),
      totalAdRevenue,
      totalDealRevenue,
      totalAffiliateRevenue,
      grandTotal,
      avgRevenuePerVideo: withRevenue.length > 0 ? grandTotal / withRevenue.length : 0,
      topEarner: withRevenue[0] ?? null,
      revenueBySource: [
        { source: "Ad Revenue", amount: totalAdRevenue },
        { source: "Sponsorships", amount: totalDealRevenue },
        { source: "Affiliates", amount: totalAffiliateRevenue },
      ],
    };
  }, [videoQueue, deals, affiliateTxns, videoAnalytics, videoCompanies]);

  return { data: summary, isLoading: dealsLoading || affLoading || queueLoading };
}
