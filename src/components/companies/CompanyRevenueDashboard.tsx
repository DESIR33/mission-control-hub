import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp } from "lucide-react";
import { useCompanies } from "@/hooks/use-companies";
import { useDeals } from "@/hooks/use-deals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";

export function CompanyRevenueDashboard() {
  const { data: companies = [] } = useCompanies();
  const { data: deals = [] } = useDeals();
  const { workspaceId } = useWorkspace();

  const { data: affiliates = [] } = useQuery({
    queryKey: ["company-revenue-affiliates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("affiliate_programs")
        .select("company_id, commission_percentage")
        .eq("workspace_id", workspaceId);
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const companyRevenue = companies.map((company) => {
    const companyDeals = deals.filter((d) => d.company_id === company.id);
    const wonDeals = companyDeals.filter((d) => d.stage === "closed_won");
    const pipelineDeals = companyDeals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage));

    const lifetime = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
    const pipeline = pipelineDeals.reduce((s, d) => s + (d.value || 0), 0);
    const hasAffiliate = affiliates.some((a) => a.company_id === company.id);

    return {
      id: company.id,
      name: company.name.length > 18 ? company.name.slice(0, 18) + "…" : company.name,
      fullName: company.name,
      lifetime,
      pipeline,
      dealCount: companyDeals.length,
      wonCount: wonDeals.length,
      hasAffiliate,
    };
  })
    .filter((c) => c.dealCount > 0)
    .sort((a, b) => b.lifetime + b.pipeline - (a.lifetime + a.pipeline))
    .slice(0, 10);

  const totalLifetime = companyRevenue.reduce((s, c) => s + c.lifetime, 0);
  const totalPipeline = companyRevenue.reduce((s, c) => s + c.pipeline, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-primary" />
          Company Revenue Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xl font-bold">${totalLifetime.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Lifetime Value</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xl font-bold">${totalPipeline.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">In Pipeline</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xl font-bold">{companyRevenue.length}</p>
            <p className="text-xs text-muted-foreground">Active Companies</p>
          </div>
        </div>

        {companyRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={companyRevenue}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(val: number, name: string) => [`$${val.toLocaleString()}`, name === "lifetime" ? "Closed Won" : "Pipeline"]}
              />
              <Bar dataKey="lifetime" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pipeline" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No company revenue data yet</p>
        )}
      </CardContent>
    </Card>
  );
}
