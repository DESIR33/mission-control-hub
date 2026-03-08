/**
 * Wraps the MissionBriefing component from the Command Center as the YouTube Hub dashboard.
 * The MissionBriefing already provides a comprehensive channel overview with KPIs.
 */
import { MissionBriefing } from "@/components/command-center";
import { SyncStatusBar } from "@/components/analytics";

export function AnalyticsOverviewContent() {
  return (
    <div className="space-y-6">
      <SyncStatusBar />
      
      <MissionBriefing />
    </div>
  );
}
