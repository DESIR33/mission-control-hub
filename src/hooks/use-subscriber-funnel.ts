import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { subDays, format } from "date-fns";

export type FunnelRange = "7d" | "30d" | "90d";

interface FunnelStep {
  label: string;
  value: number;
  previousValue: number;
  changePercent: number;
}

interface MagnetVideo {
  title: string;
  youtube_video_id: string;
  views: number;
  subscribers_gained: number;
  conversion_rate: number; // subs per 1000 views
  impressions_ctr: number;
}

interface TrafficConversion {
  source: string;
  views: number;
  estimated_subs: number;
  conversion_rate: number;
}

export interface SubscriberFunnelData {
  funnel: FunnelStep[];
  magnetVideos: MagnetVideo[];
  trafficConversions: TrafficConversion[];
  dailyGrowth: { date: string; gained: number; lost: number; net: number }[];
}

export function useSubscriberFunnel(range: FunnelRange = "30d") {
  const { workspaceId } = useWorkspace();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  return useQuery({
    queryKey: ["subscriber-funnel", workspaceId, range],
    queryFn: async (): Promise<SubscriberFunnelData> => {
      if (!workspaceId) {
        return { funnel: [], magnetVideos: [], trafficConversions: [], dailyGrowth: [] };
      }

      const startDate = format(subDays(new Date(), days), "yyyy-MM-dd");
      const prevStartDate = format(subDays(new Date(), days * 2), "yyyy-MM-dd");
      const prevEndDate = format(subDays(new Date(), days), "yyyy-MM-dd");

      const [channelRes, prevChannelRes, videoRes, trafficRes] = await Promise.all([
        supabase
          .from("youtube_channel_analytics" as any)
          .select("*")
          .eq("workspace_id", workspaceId)
          .gte("date", startDate)
          .order("date", { ascending: true }),
        supabase
          .from("youtube_channel_analytics" as any)
          .select("*")
          .eq("workspace_id", workspaceId)
          .gte("date", prevStartDate)
          .lt("date", prevEndDate),
        supabase
          .from("youtube_video_analytics" as any)
          .select("title, youtube_video_id, views, subscribers_gained, subscribers_lost, impressions_ctr, impressions, average_view_percentage")
          .eq("workspace_id", workspaceId)
          .gte("date", startDate),
        supabase
          .from("youtube_traffic_sources" as any)
          .select("source_type, views")
          .eq("workspace_id", workspaceId)
          .gte("date", startDate),
      ]);

      const channel = (channelRes.data ?? []) as any[];
      const prevChannel = (prevChannelRes.data ?? []) as any[];
      const videos = (videoRes.data ?? []) as any[];
      const traffic = (trafficRes.data ?? []) as any[];

      // Aggregate current period
      const totalImpressions = channel.reduce((s, r) => s + (r.impressions || 0), 0);
      const totalViews = channel.reduce((s, r) => s + (r.views || 0), 0);
      const totalSubsGained = channel.reduce((s, r) => s + (r.subscribers_gained || 0), 0);
      const avgViewPct =
        channel.length > 0
          ? channel.reduce((s, r) => s + (r.average_view_percentage || 0), 0) / channel.length
          : 0;
      const engagedViews = Math.round(totalViews * (avgViewPct / 100));

      // Aggregate previous period
      const prevImpressions = prevChannel.reduce((s, r) => s + (r.impressions || 0), 0);
      const prevViews = prevChannel.reduce((s, r) => s + (r.views || 0), 0);
      const prevSubsGained = prevChannel.reduce((s, r) => s + (r.subscribers_gained || 0), 0);
      const prevAvgViewPct =
        prevChannel.length > 0
          ? prevChannel.reduce((s, r) => s + (r.average_view_percentage || 0), 0) / prevChannel.length
          : 0;
      const prevEngagedViews = Math.round(prevViews * (prevAvgViewPct / 100));

      const pctChange = (curr: number, prev: number) =>
        prev === 0 ? 0 : ((curr - prev) / prev) * 100;

      const funnel: FunnelStep[] = [
        {
          label: "Impressions",
          value: totalImpressions,
          previousValue: prevImpressions,
          changePercent: pctChange(totalImpressions, prevImpressions),
        },
        {
          label: "Views",
          value: totalViews,
          previousValue: prevViews,
          changePercent: pctChange(totalViews, prevViews),
        },
        {
          label: "Engaged Views",
          value: engagedViews,
          previousValue: prevEngagedViews,
          changePercent: pctChange(engagedViews, prevEngagedViews),
        },
        {
          label: "Subscribers",
          value: totalSubsGained,
          previousValue: prevSubsGained,
          changePercent: pctChange(totalSubsGained, prevSubsGained),
        },
      ];

      // Aggregate videos by youtube_video_id
      const videoMap = new Map<
        string,
        { title: string; views: number; subs: number; ctr: number; count: number }
      >();
      for (const v of videos) {
        const existing = videoMap.get(v.youtube_video_id) ?? {
          title: v.title,
          views: 0,
          subs: 0,
          ctr: 0,
          count: 0,
        };
        existing.views += v.views || 0;
        existing.subs += v.subscribers_gained || 0;
        existing.ctr += v.impressions_ctr || 0;
        existing.count += 1;
        videoMap.set(v.youtube_video_id, existing);
      }

      const magnetVideos: MagnetVideo[] = Array.from(videoMap.entries())
        .filter(([, v]) => v.views > 0)
        .map(([id, v]) => ({
          title: v.title,
          youtube_video_id: id,
          views: v.views,
          subscribers_gained: v.subs,
          conversion_rate: (v.subs / v.views) * 1000,
          impressions_ctr: v.count > 0 ? v.ctr / v.count : 0,
        }))
        .sort((a, b) => b.conversion_rate - a.conversion_rate)
        .slice(0, 10);

      // Traffic source conversions
      const trafficMap = new Map<string, number>();
      for (const t of traffic) {
        trafficMap.set(t.source_type, (trafficMap.get(t.source_type) ?? 0) + (t.views || 0));
      }
      const totalTrafficViews = Array.from(trafficMap.values()).reduce((s, v) => s + v, 0);
      const trafficConversions: TrafficConversion[] = Array.from(trafficMap.entries())
        .map(([source, views]) => ({
          source,
          views,
          estimated_subs:
            totalTrafficViews > 0
              ? Math.round(totalSubsGained * (views / totalTrafficViews))
              : 0,
          conversion_rate: totalTrafficViews > 0 ? (views / totalTrafficViews) * 100 : 0,
        }))
        .sort((a, b) => b.views - a.views);

      // Daily growth
      const dailyGrowth = channel.map((r: any) => ({
        date: r.date,
        gained: r.subscribers_gained || 0,
        lost: r.subscribers_lost || 0,
        net: r.net_subscribers || 0,
      }));

      return { funnel, magnetVideos, trafficConversions, dailyGrowth };
    },
    enabled: !!workspaceId,
  });
}
