import { useEffect, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import {
  BarChart3, TrendingUp, DollarSign,
  MousePointerClick, Users,
  MessageSquare, Crosshair, UserCheck,
  Zap, FlaskConical,
  Target, Tv, FileText, Wrench,
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSyncYouTube } from "@/hooks/use-youtube-analytics";
import { useSyncYouTubeAnalytics } from "@/hooks/use-youtube-analytics-api";

// Command Center section components
import { GrowthForecastSection } from "@/components/command-center/sections/GrowthForecastSection";
import { SubscriberIntelSection } from "@/components/command-center/sections/SubscriberIntelSection";
import { CompetitorIntelSection } from "@/components/command-center/sections/CompetitorIntelSection";
import { CtrViralitySection } from "@/components/command-center/sections/CtrViralitySection";
import { RevenueHubSection } from "@/components/command-center/sections/RevenueHubSection";
import { ChannelPulse } from "@/components/command-center";
import { AIGrowthCoach } from "@/components/command-center";
import { ABTestingDashboard } from "@/components/command-center/sections/ABTestingDashboard";

// Analytics section components
import { SubscriberFunnel } from "@/components/analytics";

// Standalone page content wrappers
import { AnalyticsOverviewContent } from "@/components/youtube-hub/AnalyticsOverviewContent";

// Combined section wrappers
import { ChannelVideosSection } from "@/components/youtube-hub/ChannelVideosSection";
import { DemographicsReachSection } from "@/components/youtube-hub/DemographicsReachSection";
import { CommentsSection } from "@/components/youtube-hub/CommentsSection";
import { ContentStrategySection } from "@/components/youtube-hub/ContentStrategySection";
import { UploadPlaylistsSection } from "@/components/youtube-hub/UploadPlaylistsSection";
import { ExperimentsComparisonContent } from "@/components/youtube-hub/ExperimentsComparisonContent";
import { VideoDecayDashboard } from "@/components/youtube-hub/VideoDecayDashboard";
import { VideoSeriesDashboard } from "@/components/youtube-hub/VideoSeriesDashboard";
import { AudienceOverlapDetection } from "@/components/youtube-hub/AudienceOverlapDetection";

type Section =
  | "dashboard"
  | "channel-videos"
  | "ctr-virality"
  | "ab-testing"
  | "demographics"
  | "subscribers"
  | "comments"
  | "uploads"
  | "strategy"
  | "experiments"
  | "decay"
  | "series"
  | "overlap";

const SECTION_LABELS: Record<Section, string> = {
  dashboard: "Dashboard",
  "channel-videos": "Channel & Videos",
  "ctr-virality": "CTR & Virality",
  "ab-testing": "A/B Testing",
  demographics: "Demographics & Reach",
  subscribers: "Subscriber Intel",
  comments: "Comments",
  uploads: "Upload & Playlists",
  strategy: "Content & Strategy",
  experiments: "Optimization Experiments",
  decay: "Performance Decay",
  series: "Video Series",
  overlap: "Audience Overlap",
};

const SECTION_COMPONENTS: Record<Section, React.ComponentType> = {
  dashboard: AnalyticsOverviewContent,
  "channel-videos": ChannelVideosSection,
  "ctr-virality": CtrViralitySection,
  "ab-testing": ABTestingDashboard,
  demographics: DemographicsReachSection,
  subscribers: SubscriberIntelSection,
  comments: CommentsSection,
  uploads: UploadPlaylistsSection,
  strategy: ContentStrategySection,
  experiments: ExperimentsComparisonContent,
  decay: VideoDecayDashboard,
  series: VideoSeriesDashboard,
  overlap: AudienceOverlapDetection,
};

const VALID_SECTIONS = new Set(Object.keys(SECTION_COMPONENTS));

export default function YouTubeHubPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = (section && VALID_SECTIONS.has(section) ? section : null) as Section | null;

  const { isLoading: workspaceLoading } = useWorkspace();
  const syncYouTube = useSyncYouTube();
  const syncAnalytics = useSyncYouTubeAnalytics();

  // Auto-sync YouTube data on page load
  const hasSynced = useRef(false);
  useEffect(() => {
    if (hasSynced.current || workspaceLoading) return;
    hasSynced.current = true;
    syncYouTube.mutate();
    syncAnalytics.mutate({});
  }, [workspaceLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect bare /youtube to /youtube/dashboard
  if (!activeSection) {
    return <Navigate to="/youtube/dashboard" replace />;
  }

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ActiveComponent = SECTION_COMPONENTS[activeSection];
  const label = SECTION_LABELS[activeSection];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <ChannelPulse />
      </div>

      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-foreground truncate">{label}</h1>
            <p className="text-xs text-muted-foreground">Content Management</p>
          </div>
        </div>

        <div className="mt-4 md:mt-6">
          <ActiveComponent />
        </div>
      </div>

      <AIGrowthCoach />
    </div>
  );
}

// Growth page reuses YouTube Hub section components
export function GrowthPage() {
  const { section } = useParams<{ section: string }>();

  const GROWTH_COMPONENTS: Record<string, React.ComponentType> = {
    forecast: GrowthForecastSection,
    funnel: SubscriberFunnel,
    competitors: CompetitorIntelSection,
  };

  const GROWTH_LABELS: Record<string, string> = {
    forecast: "Growth Forecast",
    funnel: "Growth Funnel",
    competitors: "Competitor Intel",
  };

  const activeSection = section && GROWTH_COMPONENTS[section] ? section : null;

  if (!activeSection) {
    return <Navigate to="/growth/forecast" replace />;
  }

  const ActiveComponent = GROWTH_COMPONENTS[activeSection];
  const label = GROWTH_LABELS[activeSection];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-foreground truncate">{label}</h1>
            <p className="text-xs text-muted-foreground">Growth</p>
          </div>
        </div>
        <div className="mt-4 md:mt-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
