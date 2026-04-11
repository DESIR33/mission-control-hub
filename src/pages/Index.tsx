import { DollarSign, Users, Film, CheckSquare, TrendingUp, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MissionBriefingPanel } from "@/components/dashboard/MissionBriefingPanel";
import { UpcomingTasksPanel } from "@/components/dashboard/UpcomingTasksPanel";
import { DealsPipelinePanel } from "@/components/dashboard/DealsPipelinePanel";
import { PipelineHealth } from "@/components/dashboard/PipelineHealth";
import { TopContentRevenue } from "@/components/dashboard/TopContentRevenue";
import { NeedsAttentionPanel } from "@/components/dashboard/NeedsAttentionPanel";
import { FloatingAgentChat } from "@/components/dashboard/FloatingAgentChat";
import {
  useDashboardStats,
  usePipelineHealth,
  useRevenueData,
  useNeedsAttention,
  useAiBriefing,
} from "@/hooks/use-dashboard-stats";
import { useWorkspaceFeatures } from "@/hooks/use-workspace-features";

function Index() {
  const { isFeatureEnabled } = useWorkspaceFeatures();
  const { data: stats } = useDashboardStats();
  const { data: pipeline } = usePipelineHealth();
  const { data: revenue } = useRevenueData();
  const { data: attentionItems } = useNeedsAttention();
  const { data: briefingItems } = useAiBriefing();

  const showFinance = isFeatureEnabled("finance");
  const showNetwork = isFeatureEnabled("network");
  const showContent = isFeatureEnabled("content_pipeline") || isFeatureEnabled("content_management");
  const showTasks = isFeatureEnabled("tasks");
  const showAi = isFeatureEnabled("ai_hub");
  const showGrowth = isFeatureEnabled("growth");

  const pipelineValue = stats?.pipelineValue ?? 0;
  const pipelineDisplay =
    pipelineValue >= 1000
      ? `$${(pipelineValue / 1000).toFixed(0)}k`
      : `$${pipelineValue}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 min-h-screen overflow-hidden min-w-0">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {(showFinance || showNetwork) && (
          <KpiCard
            title="Deal Pipeline"
            value={pipelineDisplay}
            change={
              stats?.closingThisWeek
                ? `${stats.closingThisWeek} closing this week`
                : undefined
            }
            changeType={stats?.closingThisWeek ? "positive" : "neutral"}
            icon={TrendingUp}
            glowClass="glow-success"
          />
        )}
        {showNetwork && (
          <KpiCard
            title="Active Contacts"
            value={String(stats?.contactCount ?? 0)}
            change={
              stats?.activeContactCount
                ? `${stats.activeContactCount} active`
                : undefined
            }
            changeType="neutral"
            icon={Users}
          />
        )}
        {showContent && (
          <KpiCard
            title="Content in Pipeline"
            value={String(stats?.contentInPipeline ?? 0)}
            change={
              stats?.contentInEditing
                ? `${stats.contentInEditing} in editing`
                : undefined
            }
            changeType="neutral"
            icon={Film}
          />
        )}
        {showFinance && (
          <KpiCard
            title="Total Deals"
            value={String(stats?.totalDeals ?? 0)}
            changeType="neutral"
            icon={DollarSign}
          />
        )}
        {showAi && (
          <KpiCard
            title="AI Proposals"
            value={String(stats?.pendingProposals ?? 0)}
            change={
              stats?.pendingProposals
                ? `${stats.pendingProposals} awaiting approval`
                : "All reviewed"
            }
            changeType={stats?.pendingProposals ? "neutral" : "positive"}
            icon={AlertTriangle}
          />
        )}
        {showFinance && (
          <KpiCard
            title="Monthly Revenue"
            value={
              revenue?.monthly?.length
                ? `$${(revenue.monthly[revenue.monthly.length - 1]?.amount ?? 0).toLocaleString()}`
                : "$0"
            }
            changeType="positive"
            icon={CheckSquare}
          />
        )}
      </div>

      {/* Main Grid — Bloomberg-style dense layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left — Briefing + Attention */}
        <div className="lg:col-span-5 space-y-4">
          <MissionBriefingPanel items={briefingItems} />
          <NeedsAttentionPanel items={attentionItems} />
        </div>

        {/* Center — Tasks + Deals */}
        {(showTasks || showFinance) && (
          <div className="lg:col-span-4 space-y-4">
            {showTasks && <UpcomingTasksPanel />}
            {showFinance && <DealsPipelinePanel />}
          </div>
        )}

        {/* Right — Content + Pipeline Health */}
        {(showContent || showFinance || showNetwork) && (
          <div className="lg:col-span-3 space-y-4">
            {showContent && <TopContentRevenue />}
            <PipelineHealth
              contacts={showNetwork ? pipeline?.contacts : undefined}
              content={showContent ? pipeline?.content : undefined}
              deals={showFinance ? pipeline?.deals : undefined}
            />
          </div>
        )}
      </div>

      {/* Floating Agent Chat */}
      <FloatingAgentChat />
    </div>
  );
}

export default Index;
