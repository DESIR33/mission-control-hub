/**
 * YouTube Hub dashboard with performance alerts, content decay detection, and channel overview.
 */
import { MissionBriefing } from "@/components/command-center";
import { SyncStatusBar } from "@/components/analytics";
import { VideoPerformanceAlertsFeed } from "@/components/youtube-hub/VideoPerformanceAlertsFeed";
import { ContentDecayDetector } from "@/components/youtube-hub/ContentDecayDetector";
import { PublishTimeOptimizer } from "@/components/youtube-hub/PublishTimeOptimizer";
import { VideoComparisonTool } from "@/components/youtube-hub/VideoComparisonTool";
import { RevenueAttributionDashboard } from "@/components/youtube-hub/RevenueAttributionDashboard";

export function AnalyticsOverviewContent() {
  return (
    <div className="space-y-6">
      <SyncStatusBar />

      {/* Performance Alerts & Decay Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VideoPerformanceAlertsFeed />
        <ContentDecayDetector />
      </div>

      {/* Publish Time Optimizer & Video Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PublishTimeOptimizer />
        <VideoComparisonTool />
      </div>

      {/* Revenue Attribution */}
      <RevenueAttributionDashboard />

      <MissionBriefing />
    </div>
  );
}
