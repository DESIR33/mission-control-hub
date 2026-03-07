import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3, TrendingUp, DollarSign,
  MousePointerClick, Users,
  ChevronLeft, ChevronRight,
  MessageSquare, Crosshair, UserCheck,
  Menu, Zap, FlaskConical,
  Target, Tv, FileText, Wrench,
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSyncYouTube } from "@/hooks/use-youtube-analytics";
import { useSyncYouTubeAnalytics } from "@/hooks/use-youtube-analytics-api";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
import { WeeklyReportsContent } from "@/components/youtube-hub/WeeklyReportsContent";

// Combined section wrappers
import { ChannelVideosSection } from "@/components/youtube-hub/ChannelVideosSection";
import { DemographicsReachSection } from "@/components/youtube-hub/DemographicsReachSection";
import { CommentsSection } from "@/components/youtube-hub/CommentsSection";
import { ContentStrategySection } from "@/components/youtube-hub/ContentStrategySection";
import { UploadPlaylistsSection } from "@/components/youtube-hub/UploadPlaylistsSection";

type Section =
  | "dashboard"
  | "reports"
  | "channel_videos"
  | "ctr_viral"
  | "ab_testing"
  | "demographics_reach"
  | "subscribers"
  | "comments_all"
  | "growth_forecast"
  | "growth_funnel"
  | "competitors"
  | "revenue"
  | "content_strategy"
  | "upload_playlists";

const SECTIONS: { key: Section; label: string; icon: React.ReactNode; group: string }[] = [
  // Overview
  { key: "dashboard", label: "Dashboard", icon: <Zap className="w-3.5 h-3.5" />, group: "Overview" },
  { key: "reports", label: "Weekly Reports", icon: <FileText className="w-3.5 h-3.5" />, group: "Overview" },
  // Performance
  { key: "channel_videos", label: "Channel & Videos", icon: <Tv className="w-3.5 h-3.5" />, group: "Performance" },
  { key: "ctr_viral", label: "CTR & Virality", icon: <MousePointerClick className="w-3.5 h-3.5" />, group: "Performance" },
  { key: "ab_testing", label: "A/B Testing", icon: <FlaskConical className="w-3.5 h-3.5" />, group: "Performance" },
  // Audience
  { key: "demographics_reach", label: "Demographics & Reach", icon: <Users className="w-3.5 h-3.5" />, group: "Audience" },
  { key: "subscribers", label: "Subscriber Intel", icon: <UserCheck className="w-3.5 h-3.5" />, group: "Audience" },
  { key: "comments_all", label: "Comments", icon: <MessageSquare className="w-3.5 h-3.5" />, group: "Audience" },
  // Growth
  { key: "growth_forecast", label: "Growth Forecast", icon: <TrendingUp className="w-3.5 h-3.5" />, group: "Growth" },
  { key: "growth_funnel", label: "Growth Funnel", icon: <Target className="w-3.5 h-3.5" />, group: "Growth" },
  { key: "competitors", label: "Competitor Intel", icon: <Crosshair className="w-3.5 h-3.5" />, group: "Growth" },
  // Revenue
  { key: "revenue", label: "Revenue Analytics", icon: <DollarSign className="w-3.5 h-3.5" />, group: "Revenue" },
  // Content Tools
  { key: "content_strategy", label: "Content & Strategy", icon: <Wrench className="w-3.5 h-3.5" />, group: "Content Tools" },
  { key: "upload_playlists", label: "Upload & Playlists", icon: <Wrench className="w-3.5 h-3.5" />, group: "Content Tools" },
];

const SECTION_COMPONENTS: Record<Section, React.ComponentType> = {
  dashboard: AnalyticsOverviewContent,
  reports: WeeklyReportsContent,
  channel_videos: ChannelVideosSection,
  ctr_viral: CtrViralitySection,
  ab_testing: ABTestingDashboard,
  demographics_reach: DemographicsReachSection,
  subscribers: SubscriberIntelSection,
  comments_all: CommentsSection,
  growth_forecast: GrowthForecastSection,
  growth_funnel: SubscriberFunnel,
  competitors: CompetitorIntelSection,
  revenue: RevenueHubSection,
  content_strategy: ContentStrategySection,
  upload_playlists: UploadPlaylistsSection,
};

function SidebarNav({
  activeSection,
  setActiveSection,
  sidebarCollapsed,
  setSidebarCollapsed,
  onSelect,
}: {
  activeSection: Section;
  setActiveSection: (s: Section) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  onSelect?: () => void;
}) {
  const groups = Array.from(new Set(SECTIONS.map((s) => s.group)));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">YouTube Hub</span>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hidden md:block"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className="p-2 space-y-3 overflow-y-auto flex-1">
        {groups.map((group) => (
          <div key={group}>
            {!sidebarCollapsed && (
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-2 mb-1">{group}</p>
            )}
            <div className="space-y-0.5">
              {SECTIONS.filter((s) => s.group === group).map((section) => (
                <button
                  key={section.key}
                  onClick={() => { setActiveSection(section.key); onSelect?.(); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    activeSection === section.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title={sidebarCollapsed ? section.label : undefined}
                >
                  {section.icon}
                  {!sidebarCollapsed && <span>{section.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default function YouTubeHubPage() {
  const [searchParams] = useSearchParams();
  const initialSection = (searchParams.get("section") as Section) || "dashboard";
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();
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

  // Update URL when section changes
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("section", activeSection);
    window.history.replaceState({}, "", `?${sp.toString()}`);
  }, [activeSection]);

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ActiveComponent = SECTION_COMPONENTS[activeSection];
  const activeSectionInfo = SECTIONS.find((s) => s.key === activeSection)!;

  return (
    <div className="flex h-full">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className={`shrink-0 border-r border-border bg-card/50 transition-all duration-200 ${
            sidebarCollapsed ? "w-12" : "w-56"
          }`}
        >
          <SidebarNav
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        </div>
      )}

      {/* Mobile Nav Sheet */}
      {isMobile && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-card border-border">
            <SidebarNav
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              sidebarCollapsed={false}
              setSidebarCollapsed={() => {}}
              onSelect={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Channel Pulse - persistent KPI header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <ChannelPulse />
        </div>

        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            {isMobile && (
              <button
                onClick={() => setMobileNavOpen(true)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground shrink-0"
                aria-label="Open YouTube Hub menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {activeSectionInfo.icon}
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-foreground truncate">{activeSectionInfo.label}</h1>
              <p className="text-xs text-muted-foreground">YouTube Hub</p>
            </div>
          </div>

          <ActiveComponent />
        </div>
      </div>

      {/* AI Growth Coach - floating panel */}
      <AIGrowthCoach />
    </div>
  );
}
