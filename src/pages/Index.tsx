import { DollarSign, Users, Film, CheckSquare, TrendingUp, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AiBriefing } from "@/components/dashboard/AiBriefing";
import { PipelineHealth } from "@/components/dashboard/PipelineHealth";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TopContentRevenue } from "@/components/dashboard/TopContentRevenue";
import { UnifiedAlertHub } from "@/components/dashboard/UnifiedAlertHub";
import { SprintWidget } from "@/components/dashboard/SprintWidget";
import { GoalPaceWidget } from "@/components/dashboard/GoalPaceWidget";
import { GrowthCommandWidget } from "@/components/dashboard/GrowthCommandWidget";
import { WeeklyActionPlanCard } from "@/components/dashboard/WeeklyActionPlanCard";
import { DailyOpsView } from "@/components/daily-ops/DailyOpsView";
import {
  useDashboardStats,
  usePipelineHealth,
  useRevenueData,
  useNeedsAttention,
  useAiBriefing,
} from "@/hooks/use-dashboard-stats";
import { NewsletterWidget } from "@/components/dashboard/NewsletterWidget";

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen overflow-hidden min-w-0">
      {/* Daily Operations — primary view */}
      <DailyOpsView />

      {/* Growth Command Widget */}
      <GrowthCommandWidget />

      {/* Unified Alerts Hub */}
      <UnifiedAlertHub />

      {/* Sprint + Goal Pace Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SprintWidget />
        <GoalPaceWidget />
      </div>

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

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <AiBriefing items={briefingItems} attentionItems={attentionItems} />
          <WeeklyActionPlanCard />
          <PipelineHealth
            contacts={pipeline?.contacts}
            content={pipeline?.content}
            deals={pipeline?.deals}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <TopContentRevenue />
          <RevenueChart
            monthly={revenue?.monthly}
            sponsors={revenue?.sponsors}
            affiliates={revenue?.affiliates}
            ads={revenue?.ads}
          />
          <NewsletterWidget />
        </div>
      </div>
    </div>
  );
}

export default Index;
