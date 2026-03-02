import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useMemo } from "react";
import { useContentRevenue } from "@/hooks/use-content-revenue";

export interface SponsorAttribution {
  contactId: string | null;
  contactName: string;
  companyId: string | null;
  companyName: string;
  totalDealValue: number;
  videosSponsored: number;
  avgDealSize: number;
  videoLinks: Array<{
    videoTitle: string;
    dealValue: number;
    videoRevenue: number;
    roi: number;
  }>;
  lifetimeValue: number;
  lastDealDate: string | null;
}

export interface SponsorAttributionSummary {
  sponsors: SponsorAttribution[];
  topSponsor: SponsorAttribution | null;
  avgDealSize: number;
  totalSponsorRevenue: number;
  sponsorRetentionRate: number;
}

export function useSponsorAttribution() {
  const { workspaceId } = useWorkspace();
  const { data: revenueSummary } = useContentRevenue();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["sponsor-attribution-deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, value, stage, video_queue_id, contact_id, company_id, closed_at, companies(id, name), contacts(id, first_name, last_name)")
        .eq("workspace_id", workspaceId!)
        .eq("stage", "closed_won")
        .is("deleted_at", null)
        .not("video_queue_id", "is", null);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const { data: videoQueue = [] } = useQuery({
    queryKey: ["sponsor-attribution-queue", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_queue")
        .select("id, title, youtube_video_id")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const summary = useMemo((): SponsorAttributionSummary | null => {
    if (!deals.length) return null;

    const revenueByQueueId = new Map<number, number>();
    if (revenueSummary?.links) {
      for (const link of revenueSummary.links) {
        revenueByQueueId.set(link.videoQueueId, link.totalRevenue);
      }
    }

    const queueTitles = new Map<number, string>();
    for (const vq of videoQueue) {
      queueTitles.set(Number(vq.id), vq.title);
    }

    const sponsorMap = new Map<string, SponsorAttribution>();

    for (const deal of deals) {
      const key = deal.company_id || deal.contact_id || "unknown";
      const contactName = deal.contacts
        ? `${deal.contacts.first_name ?? ""} ${deal.contacts.last_name ?? ""}`.trim()
        : "Unknown";
      const companyName = deal.companies?.name ?? "Unknown";

      if (!sponsorMap.has(key)) {
        sponsorMap.set(key, {
          contactId: deal.contact_id,
          contactName,
          companyId: deal.company_id,
          companyName,
          totalDealValue: 0,
          videosSponsored: 0,
          avgDealSize: 0,
          videoLinks: [],
          lifetimeValue: 0,
          lastDealDate: null,
        });
      }

      const sponsor = sponsorMap.get(key)!;
      const dealValue = Number(deal.value) || 0;
      const videoRevenue = revenueByQueueId.get(Number(deal.video_queue_id)) ?? 0;
      const videoTitle = queueTitles.get(Number(deal.video_queue_id)) ?? "Unknown Video";

      sponsor.totalDealValue += dealValue;
      sponsor.videosSponsored += 1;
      sponsor.videoLinks.push({
        videoTitle,
        dealValue,
        videoRevenue,
        roi: dealValue > 0 ? ((videoRevenue - dealValue) / dealValue) * 100 : 0,
      });
      sponsor.lifetimeValue += dealValue;
      if (!sponsor.lastDealDate || (deal.closed_at && deal.closed_at > sponsor.lastDealDate)) {
        sponsor.lastDealDate = deal.closed_at;
      }
    }

    const sponsors = Array.from(sponsorMap.values());
    for (const s of sponsors) {
      s.avgDealSize = s.videosSponsored > 0 ? s.totalDealValue / s.videosSponsored : 0;
    }
    sponsors.sort((a, b) => b.totalDealValue - a.totalDealValue);

    const totalSponsorRevenue = sponsors.reduce((s, sp) => s + sp.totalDealValue, 0);
    const avgDealSize = sponsors.length > 0 ? totalSponsorRevenue / deals.length : 0;
    const repeatSponsors = sponsors.filter((s) => s.videosSponsored > 1).length;
    const sponsorRetentionRate = sponsors.length > 0 ? (repeatSponsors / sponsors.length) * 100 : 0;

    return {
      sponsors,
      topSponsor: sponsors[0] ?? null,
      avgDealSize,
      totalSponsorRevenue,
      sponsorRetentionRate,
    };
  }, [deals, revenueSummary, videoQueue]);

  return { data: summary, isLoading };
}
