import { motion } from "framer-motion";
import { DollarSign, Users, Film, CheckSquare, TrendingUp, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AiBriefing } from "@/components/dashboard/AiBriefing";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { PipelineHealth } from "@/components/dashboard/PipelineHealth";
import { RevenueChart } from "@/components/dashboard/RevenueChart";

const Index = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6 gradient-mesh min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Mission Control</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tuesday, Feb 25 · Good morning, Geraldo
        </p>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard
          title="Monthly Revenue"
          value="$14.5k"
          change="+12% vs last month"
          changeType="positive"
          icon={DollarSign}
          glowClass="glow-success"
        />
        <KpiCard
          title="Active Contacts"
          value="59"
          change="+4 this week"
          changeType="positive"
          icon={Users}
        />
        <KpiCard
          title="Content in Pipeline"
          value="13"
          change="3 in editing"
          changeType="neutral"
          icon={Film}
        />
        <KpiCard
          title="Open Tasks"
          value="24"
          change="5 overdue"
          changeType="negative"
          icon={CheckSquare}
          glowClass="glow-warning"
        />
        <KpiCard
          title="Deal Pipeline"
          value="$42k"
          change="2 closing this week"
          changeType="positive"
          icon={TrendingUp}
        />
        <KpiCard
          title="AI Proposals"
          value="7"
          change="3 awaiting approval"
          changeType="neutral"
          icon={AlertTriangle}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <AiBriefing />
          <PipelineHealth />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <NeedsAttention />
          <RevenueChart />
        </div>
      </div>
    </div>
  );
};

export default Index;
