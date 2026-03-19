import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialHealthAlerts } from "@/components/finance/FinancialHealthAlerts";
import { UnifiedPLDashboard } from "@/components/finance/UnifiedPLDashboard";
import { BudgetAllocationEngine } from "@/components/finance/BudgetAllocationEngine";
import { TaxPrepDashboard } from "@/components/finance/TaxPrepDashboard";
import { RevenueOverview } from "@/components/monetization/RevenueOverview";
import { RevenueGoalTracker } from "@/components/monetization/RevenueGoalTracker";
import { YearlyIncomeTracker } from "@/components/monetization/YearlyIncomeTracker";
import { motion } from "framer-motion";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "pl", label: "Profit & Loss" },
  { value: "budget", label: "Budget" },
  { value: "tax", label: "Tax Prep" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function FinanceCommandCenterPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  const currentTab: TabValue = TABS.some((t) => t.value === tab) ? (tab as TabValue) : "overview";

  if (!tab || !TABS.some((t) => t.value === tab)) {
    return <Navigate to="/finance/hub/overview" replace />;
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Command Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue analytics, P&L, budgeting, and tax intelligence</p>
      </motion.div>

      <Tabs value={currentTab} onValueChange={(v) => navigate(`/finance/hub/${v}`, { replace: true })}>
        <TabsList className="h-auto flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-5">
          <RevenueOverview />
          <FinancialHealthAlerts />
          <RevenueGoalTracker />
          <YearlyIncomeTracker />
        </TabsContent>

        <TabsContent value="pl" className="mt-5">
          <UnifiedPLDashboard />
        </TabsContent>

        <TabsContent value="budget" className="mt-5">
          <BudgetAllocationEngine />
        </TabsContent>

        <TabsContent value="tax" className="mt-5">
          <TaxPrepDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
