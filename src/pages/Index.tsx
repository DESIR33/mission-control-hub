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

function Index() {
  const { data: stats } = useDashboardStats();
  const { data: pipeline } = usePipelineHealth();
  const { data: revenue } = useRevenueData();
  const { data: attentionItems } = useNeedsAttention();
  const { data: briefingItems } = useAiBriefing();

  const pipelineValue = stats?.pipelineValue ?? 0;
  const pipelineDisplay =
    pipelineValue >= 1000
      ? `$${(pipelineValue / 1000).toFixed(0)}k`
      : `$${pipelineValue}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 min-h-screen overflow-hidden min-w-0">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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
        <KpiCard
          title="Total Deals"
          value={String(stats?.totalDeals ?? 0)}
          changeType="neutral"
          icon={DollarSign}
        />
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
      </div>

      {/* Main Grid — Bloomberg-style dense layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left — Briefing (takes 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <MissionBriefingPanel items={briefingItems} />
          <NeedsAttentionPanel items={attentionItems} />
        </div>

        {/* Center — Tasks + Deals (takes 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <UpcomingTasksPanel />
          <DealsPipelinePanel />
        </div>

        {/* Right — Content + Pipeline Health (takes 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <TopContentRevenue />
          <PipelineHealth
            contacts={pipeline?.contacts}
            content={pipeline?.content}
            deals={pipeline?.deals}
          />
        </div>
      </div>

      {/* Floating Agent Chat */}
      <FloatingAgentChat />
    </div>
  );
}

export default Index;
