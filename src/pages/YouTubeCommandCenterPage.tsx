import { useState } from "react";
import {
  Rocket, TrendingUp, Award, DollarSign, Clock,
  Eye, MousePointerClick, Search, Handshake, Trophy,
  MessageSquare, ListVideo, BarChart3, Users,
  Calendar, Zap, ChevronLeft, ChevronRight, Calculator, UserCheck,
} from "lucide-react";
import { useWorkspace, WorkspaceProvider } from "@/hooks/use-workspace";
import {
  GrowthForecast, VideoScorecard, ContentRevenueLinker,
  UploadTimeAnalyzer, RetentionAnalyzer, CtrOptimizer,
  ContentGapFinder, CollaborationTracker, MilestoneCountdown,
  CommentSentiment, PlaylistOptimizer, RevenueForecast,
  CompetitorBenchmark, ContentCalendar, ViralPredictor,
  ContentROICalculator, SubscriberImpact,
} from "@/components/command-center";

type Tab =
  | "forecast"
  | "scorecard"
  | "revenue_link"
  | "upload_time"
  | "retention"
  | "ctr"
  | "content_gaps"
  | "collaborations"
  | "milestones"
  | "sentiment"
  | "playlists"
  | "revenue_forecast"
  | "competitors"
  | "calendar"
  | "viral"
  | "roi_calculator"
  | "subscriber_impact";

const TABS: { key: Tab; label: string; icon: React.ReactNode; group: string }[] = [
  // Growth
  { key: "forecast", label: "Growth Forecast", icon: <TrendingUp className="w-3.5 h-3.5" />, group: "Growth" },
  { key: "milestones", label: "Milestones", icon: <Trophy className="w-3.5 h-3.5" />, group: "Growth" },
  { key: "competitors", label: "Competitors", icon: <Users className="w-3.5 h-3.5" />, group: "Growth" },
  { key: "subscriber_impact", label: "Sub Impact", icon: <UserCheck className="w-3.5 h-3.5" />, group: "Growth" },
  // Content
  { key: "scorecard", label: "Video Scorecard", icon: <Award className="w-3.5 h-3.5" />, group: "Content" },
  { key: "retention", label: "Retention", icon: <Eye className="w-3.5 h-3.5" />, group: "Content" },
  { key: "ctr", label: "CTR Optimizer", icon: <MousePointerClick className="w-3.5 h-3.5" />, group: "Content" },
  { key: "viral", label: "Viral Predictor", icon: <Zap className="w-3.5 h-3.5" />, group: "Content" },
  { key: "upload_time", label: "Upload Time", icon: <Clock className="w-3.5 h-3.5" />, group: "Content" },
  // Revenue
  { key: "revenue_link", label: "Content → Revenue", icon: <DollarSign className="w-3.5 h-3.5" />, group: "Revenue" },
  { key: "revenue_forecast", label: "Revenue Forecast", icon: <BarChart3 className="w-3.5 h-3.5" />, group: "Revenue" },
  { key: "roi_calculator", label: "ROI Calculator", icon: <Calculator className="w-3.5 h-3.5" />, group: "Revenue" },
  // Planning
  { key: "calendar", label: "Content Calendar", icon: <Calendar className="w-3.5 h-3.5" />, group: "Planning" },
  { key: "content_gaps", label: "Content Gaps", icon: <Search className="w-3.5 h-3.5" />, group: "Planning" },
  { key: "collaborations", label: "Collaborations", icon: <Handshake className="w-3.5 h-3.5" />, group: "Planning" },
  // Audience
  { key: "sentiment", label: "Comment Sentiment", icon: <MessageSquare className="w-3.5 h-3.5" />, group: "Audience" },
  { key: "playlists", label: "Playlists", icon: <ListVideo className="w-3.5 h-3.5" />, group: "Audience" },
];

const TAB_COMPONENTS: Record<Tab, React.ComponentType> = {
  forecast: GrowthForecast,
  scorecard: VideoScorecard,
  revenue_link: ContentRevenueLinker,
  upload_time: UploadTimeAnalyzer,
  retention: RetentionAnalyzer,
  ctr: CtrOptimizer,
  content_gaps: ContentGapFinder,
  collaborations: CollaborationTracker,
  milestones: MilestoneCountdown,
  sentiment: CommentSentiment,
  playlists: PlaylistOptimizer,
  revenue_forecast: RevenueForecast,
  competitors: CompetitorBenchmark,
  calendar: ContentCalendar,
  viral: ViralPredictor,
  roi_calculator: ContentROICalculator,
  subscriber_impact: SubscriberImpact,
};

function CommandCenterContent() {
  const [activeTab, setActiveTab] = useState<Tab>("forecast");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isLoading: workspaceLoading } = useWorkspace();

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ActiveComponent = TAB_COMPONENTS[activeTab];
  const activeTabInfo = TABS.find((t) => t.key === activeTab)!;

  // Group tabs
  const groups = Array.from(new Set(TABS.map((t) => t.group)));

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`shrink-0 border-r border-border bg-card/50 transition-all duration-200 ${
          sidebarCollapsed ? "w-12" : "w-56"
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-foreground">Command Center</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        <nav className="p-2 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 120px)" }}>
          {groups.map((group) => (
            <div key={group}>
              {!sidebarCollapsed && (
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider px-2 mb-1">{group}</p>
              )}
              <div className="space-y-0.5">
                {TABS.filter((t) => t.group === group).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      activeTab === tab.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    title={sidebarCollapsed ? tab.label : undefined}
                  >
                    {tab.icon}
                    {!sidebarCollapsed && <span>{tab.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            {activeTabInfo.icon}
            <div>
              <h1 className="text-lg font-bold text-foreground">{activeTabInfo.label}</h1>
              <p className="text-xs text-muted-foreground">YouTube Command Center</p>
            </div>
          </div>

          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

export default function YouTubeCommandCenterPage() {
  return (
    <WorkspaceProvider>
      <CommandCenterContent />
    </WorkspaceProvider>
  );
}
