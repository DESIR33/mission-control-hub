import { useEffect, useRef, useState } from "react";
import {
  Rocket, TrendingUp, DollarSign,
  Eye, MousePointerClick, Handshake, Users,
  Calendar, Brain,
  MessageSquare, ListVideo, Upload, Crosshair, UserCheck,
  RefreshCw, Mail, Zap, Sparkles, FlaskConical, Lightbulb,
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSyncYouTube } from "@/hooks/use-youtube-analytics";
import { useSyncYouTubeAnalytics } from "@/hooks/use-youtube-analytics-api";


import { GrowthForecastSection } from "@/components/command-center/sections/GrowthForecastSection";
import { SubscriberIntelSection } from "@/components/command-center/sections/SubscriberIntelSection";
import { CompetitorIntelSection } from "@/components/command-center/sections/CompetitorIntelSection";
import { VideoPerformanceSection } from "@/components/command-center/sections/VideoPerformanceSection";
import { CtrViralitySection } from "@/components/command-center/sections/CtrViralitySection";
import { UploadThumbnailSection } from "@/components/command-center/sections/UploadThumbnailSection";
import { RevenueHubSection } from "@/components/command-center/sections/RevenueHubSection";
import { ContentPlannerSection } from "@/components/command-center/sections/ContentPlannerSection";
import { CommentHubSection } from "@/components/command-center/sections/CommentHubSection";
import { ContentStrategist } from "@/components/command-center";
import { VideoStrategist } from "@/components/command-center";
import { PlaylistOptimizer } from "@/components/command-center";
import { MissionBriefing } from "@/components/command-center";
import { ChannelPulse } from "@/components/command-center";
import { AIGrowthCoach } from "@/components/command-center";
import { SyncHistoryPanel } from "@/components/analytics/SyncHistoryPanel";
import { SequenceHealthDashboard } from "@/components/command-center/SequenceHealthDashboard";
import { ABTestingDashboard } from "@/components/command-center/sections/ABTestingDashboard";
import { CommentIntelligence } from "@/components/command-center/sections/CommentIntelligence";

type Tab =
  | "briefing"
  | "growth"
  | "subscribers"
  | "competitors"
  | "performance"
  | "ctr_viral"
  | "strategist"
  | "video_optimizer"
  | "upload_thumbnails"
  | "revenue"
  | "planner"
  | "comments"
  | "playlists"
  | "sync_history"
  | "sequences"
  | "ab_testing"
  | "comment_intel";

const TABS: { key: Tab; label: string; icon: React.ReactNode; group: string }[] = [
  // Mission
  { key: "briefing", label: "Mission Briefing", icon: <Zap className="w-3.5 h-3.5" />, group: "Mission" },
  // Growth
  { key: "growth", label: "Growth Forecast", icon: <TrendingUp className="w-3.5 h-3.5" />, group: "Growth" },
  { key: "subscribers", label: "Subscriber Intel", icon: <UserCheck className="w-3.5 h-3.5" />, group: "Growth" },
  { key: "competitors", label: "Competitor Intel", icon: <Crosshair className="w-3.5 h-3.5" />, group: "Growth" },
  // Content
  { key: "performance", label: "Video Performance", icon: <Eye className="w-3.5 h-3.5" />, group: "Content" },
  { key: "ctr_viral", label: "CTR & Virality", icon: <MousePointerClick className="w-3.5 h-3.5" />, group: "Content" },
  { key: "strategist", label: "AI Strategist", icon: <Brain className="w-3.5 h-3.5" />, group: "Content" },
  { key: "video_optimizer", label: "Video Optimizer", icon: <Sparkles className="w-3.5 h-3.5" />, group: "Content" },
  { key: "upload_thumbnails", label: "Upload & Thumbnails", icon: <Upload className="w-3.5 h-3.5" />, group: "Content" },
  { key: "ab_testing", label: "A/B Testing", icon: <FlaskConical className="w-3.5 h-3.5" />, group: "Content" },
  // Revenue
  { key: "revenue", label: "Revenue Hub", icon: <DollarSign className="w-3.5 h-3.5" />, group: "Revenue" },
  // Planning
  { key: "planner", label: "Content Planner", icon: <Calendar className="w-3.5 h-3.5" />, group: "Planning" },
  // Audience
  { key: "comments", label: "Comments", icon: <MessageSquare className="w-3.5 h-3.5" />, group: "Audience" },
  { key: "comment_intel", label: "Comment Intel", icon: <Lightbulb className="w-3.5 h-3.5" />, group: "Audience" },
  { key: "playlists", label: "Playlists", icon: <ListVideo className="w-3.5 h-3.5" />, group: "Audience" },
  // Operations
  { key: "sequences", label: "Email Sequences", icon: <Mail className="w-3.5 h-3.5" />, group: "Operations" },
  { key: "sync_history", label: "Sync History", icon: <RefreshCw className="w-3.5 h-3.5" />, group: "Operations" },
];

const TAB_COMPONENTS: Record<Tab, React.ComponentType> = {
  briefing: MissionBriefing,
  growth: GrowthForecastSection,
  subscribers: SubscriberIntelSection,
  competitors: CompetitorIntelSection,
  performance: VideoPerformanceSection,
  ctr_viral: CtrViralitySection,
  strategist: ContentStrategist,
  video_optimizer: VideoStrategist,
  upload_thumbnails: UploadThumbnailSection,
  revenue: RevenueHubSection,
  planner: ContentPlannerSection,
  comments: CommentHubSection,
  playlists: PlaylistOptimizer,
  sync_history: SyncHistoryPanel,
  sequences: SequenceHealthDashboard,
  ab_testing: ABTestingDashboard,
  comment_intel: CommentIntelligence,
};

export default function YouTubeCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<Tab>("briefing");
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

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ActiveComponent = TAB_COMPONENTS[activeTab];
  const activeTabInfo = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Channel Pulse - persistent KPI header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <ChannelPulse />
      </div>

      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          {activeTabInfo.icon}
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-foreground truncate">{activeTabInfo.label}</h1>
            <p className="text-xs text-muted-foreground">YouTube Command Center</p>
          </div>
        </div>


        <div className="mt-4 md:mt-6">
          <ActiveComponent />
        </div>
      </div>

      {/* AI Growth Coach - floating panel */}
      <AIGrowthCoach />
    </div>
  );
}

