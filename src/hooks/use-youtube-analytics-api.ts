import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { getFreshness } from "@/config/data-freshness";
import { subDays } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────

export interface ChannelAnalytics {
  id: string;
  workspace_id: string;
  date: string;
  views: number;
  estimated_minutes_watched: number;
  average_view_duration_seconds: number;
  average_view_percentage: number;
  subscribers_gained: number;
  subscribers_lost: number;
  net_subscribers: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  impressions: number;
  impressions_ctr: number;
  unique_viewers: number;
  card_clicks: number;
  card_impressions: number;
  card_ctr: number;
  end_screen_element_clicks: number;
  end_screen_element_impressions: number;
  end_screen_element_ctr: number;
  estimated_revenue: number;
  estimated_ad_revenue: number;
  estimated_red_partner_revenue: number;
  gross_revenue: number;
  cpm: number;
  ad_impressions: number;
  monetized_playbacks: number;
  playback_based_cpm: number;
  fetched_at: string;
}

export interface VideoAnalytics {
  id: string;
  workspace_id: string;
  youtube_video_id: string;
  title: string;
  date: string;
  views: number;
  estimated_minutes_watched: number;
  average_view_duration_seconds: number;
  average_view_percentage: number;
  subscribers_gained: number;
  subscribers_lost: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  impressions: number;
  impressions_ctr: number;
  card_clicks: number;
  card_impressions: number;
  end_screen_element_clicks: number;
  end_screen_element_impressions: number;
  annotation_click_through_rate: number;
  estimated_revenue: number;
  fetched_at: string;
}

export interface Demographics {
  id: string;
  workspace_id: string;
  date: string;
  age_group: string;
  gender: string;
  viewer_percentage: number;
}

export interface TrafficSource {
  id: string;
  workspace_id: string;
  date: string;
  source_type: string;
  views: number;
  estimated_minutes_watched: number;
}

export interface Geography {
  id: string;
  workspace_id: string;
  date: string;
  country: string;
  views: number;
  estimated_minutes_watched: number;
  average_view_duration_seconds: number;
  subscribers_gained: number;
}

export interface DeviceType {
  id: string;
  workspace_id: string;
  date: string;
  device_type: string;
  views: number;
  estimated_minutes_watched: number;
}

// ── Hooks ─────────────────────────────────────────────────────────────

/** Fetches daily channel analytics. Accepts days to fetch (defaults to 180 for period-over-period). */
export function useChannelAnalytics(days = 180) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-channel-analytics", workspaceId, days],
    queryFn: async () => {
      const cutoff = subDays(new Date(), days).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("youtube_channel_analytics" as any)
        .select("id,date,views,estimated_minutes_watched,average_view_duration_seconds,average_view_percentage,subscribers_gained,subscribers_lost,net_subscribers,likes,dislikes,comments,shares,impressions,impressions_ctr,unique_viewers,card_clicks,card_impressions,card_ctr,end_screen_element_clicks,end_screen_element_impressions,end_screen_element_ctr,estimated_revenue,estimated_ad_revenue,cpm,ad_impressions,monetized_playbacks,playback_based_cpm")
        .eq("workspace_id", workspaceId!)
        .gte("date", cutoff)
        .order("date", { ascending: false })
        .limit(400);
      if (error) throw error;
      return ((data ?? []) as unknown as ChannelAnalytics[]).map((row) => ({
        ...row,
        workspace_id: workspaceId!,
        impressions_ctr: Number(row.impressions_ctr) * 100,
        card_ctr: Number(row.card_ctr) * 100,
        end_screen_element_ctr: Number(row.end_screen_element_ctr) * 100,
        estimated_revenue: Number(row.estimated_revenue),
        average_view_percentage: Number(row.average_view_percentage),
      }));
    },
    enabled: !!workspaceId,
    ...getFreshness("youtubeAnalyticsApi"),
  });
}

/** Fetches per-video analytics, filtered by date range. */
export function useVideoAnalytics(daysRange = 90) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-video-analytics", workspaceId, daysRange],
    queryFn: async () => {
      const cutoff = subDays(new Date(), daysRange).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("youtube_video_analytics" as any)
        .select("id,youtube_video_id,title,date,views,estimated_minutes_watched,average_view_duration_seconds,average_view_percentage,subscribers_gained,subscribers_lost,likes,dislikes,comments,shares,impressions,impressions_ctr,card_clicks,card_impressions,end_screen_element_clicks,end_screen_element_impressions,annotation_click_through_rate,estimated_revenue")
        .eq("workspace_id", workspaceId!)
        .gte("date", cutoff)
        .order("views", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return ((data ?? []) as unknown as VideoAnalytics[]).map((row) => ({
        ...row,
        workspace_id: workspaceId!,
        impressions_ctr: Number(row.impressions_ctr) * 100,
        annotation_click_through_rate: Number(row.annotation_click_through_rate) * 100,
        average_view_percentage: Number(row.average_view_percentage),
        estimated_revenue: Number(row.estimated_revenue),
      }));
    },
    enabled: !!workspaceId,
    ...getFreshness("youtubeAnalyticsApi"),
  });
}

/** Fetches the most recent demographics data. */
export function useDemographics() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-demographics", workspaceId],
    queryFn: async () => {
      const { data: latest } = await supabase
        .from("youtube_demographics" as any)
        .select("date")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false })
        .limit(1);

      if (!latest?.length) return [];

      const latestDate = (latest[0] as any).date;
      const { data, error } = await supabase
        .from("youtube_demographics" as any)
        .select("id,date,age_group,gender,viewer_percentage")
        .eq("workspace_id", workspaceId!)
        .eq("date", latestDate);
      if (error) throw error;
      return ((data ?? []) as unknown as Demographics[]).map(r => ({ ...r, workspace_id: workspaceId! }));
    },
    enabled: !!workspaceId,
    ...getFreshness("youtubeAnalyticsApi"),
  });
}

/** Fetches traffic source data for the given date range. */
export function useTrafficSources(daysRange = 90) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-traffic-sources", workspaceId, daysRange],
    queryFn: async () => {
      const cutoff = subDays(new Date(), daysRange).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("youtube_traffic_sources" as any)
        .select("id,date,source_type,views,estimated_minutes_watched")
        .eq("workspace_id", workspaceId!)
        .gte("date", cutoff)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return ((data ?? []) as unknown as TrafficSource[]).map(r => ({ ...r, workspace_id: workspaceId! }));
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

/** Fetches traffic source data for double the range (for period-over-period comparison). */
export function useTrafficSourcesWithPrevious(daysRange = 90) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-traffic-sources-prev", workspaceId, daysRange],
    queryFn: async () => {
      const cutoff = subDays(new Date(), daysRange * 2).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("youtube_traffic_sources" as any)
        .select("id,date,source_type,views,estimated_minutes_watched")
        .eq("workspace_id", workspaceId!)
        .gte("date", cutoff)
        .order("date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return ((data ?? []) as unknown as TrafficSource[]).map(r => ({ ...r, workspace_id: workspaceId! }));
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

/** Fetches the most recent geography data. */
export function useGeography() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-geography", workspaceId],
    queryFn: async () => {
      const { data: latest } = await supabase
        .from("youtube_geography" as any)
        .select("date")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false })
        .limit(1);

      if (!latest?.length) return [];

      const latestDate = (latest[0] as any).date;
      const { data, error } = await supabase
        .from("youtube_geography" as any)
        .select("id,date,country,views,estimated_minutes_watched,average_view_duration_seconds,subscribers_gained")
        .eq("workspace_id", workspaceId!)
        .eq("date", latestDate)
        .order("views", { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data ?? []) as unknown as Geography[]).map(r => ({ ...r, workspace_id: workspaceId! }));
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

/** Fetches the most recent device type data. */
export function useDeviceTypes() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["youtube-device-types", workspaceId],
    queryFn: async () => {
      const { data: latest } = await supabase
        .from("youtube_device_types" as any)
        .select("date")
        .eq("workspace_id", workspaceId!)
        .order("date", { ascending: false })
        .limit(1);

      if (!latest?.length) return [];

      const latestDate = (latest[0] as any).date;
      const { data, error } = await supabase
        .from("youtube_device_types" as any)
        .select("id,date,device_type,views,estimated_minutes_watched")
        .eq("workspace_id", workspaceId!)
        .eq("date", latestDate)
        .order("views", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as DeviceType[]).map(r => ({ ...r, workspace_id: workspaceId! }));
    },
    enabled: !!workspaceId,
    staleTime: 120_000,
  });
}

/** Triggers a YouTube Analytics API sync via the Edge Function. */
export function useSyncYouTubeAnalytics() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { start_date?: string; end_date?: string }) => {
      if (!workspaceId) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke(
        "youtube-analytics-sync",
        {
          body: {
            workspace_id: workspaceId,
            ...(params ?? {}),
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["youtube-channel-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-video-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-demographics"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-traffic-sources"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-geography"] });
      queryClient.invalidateQueries({ queryKey: ["youtube-device-types"] });
    },
  });
}
