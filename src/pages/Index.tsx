import { motion } from "framer-motion";
import { DollarSign, Users, Film, CheckSquare, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AiBriefing } from "@/components/dashboard/AiBriefing";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { PipelineHealth } from "@/components/dashboard/PipelineHealth";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fmtCurrency = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Mission Control</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard
          title="Deal Pipeline"
          value={fmtCurrency(stats.dealPipelineValue)}
          change={`${Object.values(stats.dealsByStage).reduce((a, b) => a + b, 0)} active deals`}
          changeType="positive"
          icon={DollarSign}
          glowClass="glow-success"
        />
        <KpiCard
          title="Active Contacts"
          value={String(stats.contactCount)}
          changeType="neutral"
          icon={Users}
        />
        <KpiCard
          title="Content in Pipeline"
          value={String(stats.videoQueueCount)}
          change={stats.videosByStatus["editing"] ? `${stats.videosByStatus["editing"]} in editing` : undefined}
          changeType="neutral"
          icon={Film}
        />
        <KpiCard
          title="Overdue Tasks"
          value={String(stats.overdueTaskCount)}
          change={stats.overdueTaskCount > 0 ? "needs attention" : "all clear"}
          changeType={stats.overdueTaskCount > 0 ? "negative" : "positive"}
          icon={CheckSquare}
          glowClass={stats.overdueTaskCount > 0 ? "glow-warning" : undefined}
        />
        <KpiCard
          title="Closed Revenue"
          value={fmtCurrency(
            stats.revenueByMonth.reduce((s, m) => s + m.total, 0)
          )}
          changeType="positive"
          icon={TrendingUp}
        />
        <KpiCard
          title="AI Proposals"
          value={String(stats.pendingProposalCount)}
          change={stats.pendingProposalCount > 0 ? "awaiting approval" : "none pending"}
          changeType="neutral"
          icon={AlertTriangle}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <AiBriefing items={stats.briefingItems} />
          <PipelineHealth
            contactsByStatus={stats.contactsByStatus}
            videosByStatus={stats.videosByStatus}
            dealsByStage={stats.dealsByStage}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <NeedsAttention items={stats.attentionItems} />
          <RevenueChart months={stats.revenueByMonth} />
        </div>
      </div>
    </div>
  );
};

export default Index;
