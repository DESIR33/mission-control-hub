import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialHealthAlerts } from "@/components/finance/FinancialHealthAlerts";
import { UnifiedPLDashboard } from "@/components/finance/UnifiedPLDashboard";
import { BudgetAllocationEngine } from "@/components/finance/BudgetAllocationEngine";
import { TaxPrepDashboard } from "@/components/finance/TaxPrepDashboard";

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financial Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Unified P&L, budgeting, and tax intelligence</p>
      </div>

      <Tabs value={currentTab} onValueChange={(v) => navigate(`/finance/hub/${v}`, { replace: true })}>
        <TabsList className="h-auto flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <FinancialHealthAlerts />
        </TabsContent>

        <TabsContent value="pl" className="mt-6">
          <UnifiedPLDashboard />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <BudgetAllocationEngine />
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <TaxPrepDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
