import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { differenceInDays } from "date-fns";

interface CompanyHealth {
  id: string;
  name: string;
  logo_url: string | null;
  score: number;
  trend: "up" | "down" | "stable";
  factors: { label: string; score: number }[];
}

export function CompanyHealthScore() {
  const { workspaceId } = useWorkspace();

  const { data: healthScores = [], isLoading } = useQuery<CompanyHealth[]>({
    queryKey: ["company-health", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data: companies } = await (supabase as any)
        .from("companies")
        .select("id, name, logo_url, last_contact_date, created_at, vip_tier")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("name")
        .limit(20);

      if (!companies) return [];

      const { data: deals } = await (supabase as any)
        .from("deals")
        .select("company_id, stage, value, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null);

      const { data: activities } = await (supabase as any)
        .from("activities")
        .select("entity_id, performed_at")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "company");

      const dealsByCompany = new Map<string, any[]>();
      for (const d of deals || []) {
        if (d.company_id) {
          const arr = dealsByCompany.get(d.company_id) || [];
          arr.push(d);
          dealsByCompany.set(d.company_id, arr);
        }
      }

      const activitiesByCompany = new Map<string, any[]>();
      for (const a of activities || []) {
        const arr = activitiesByCompany.get(a.entity_id) || [];
        arr.push(a);
        activitiesByCompany.set(a.entity_id, arr);
      }

      return companies.map((c: any) => {
        const companyDeals = dealsByCompany.get(c.id) || [];
        const companyActivities = activitiesByCompany.get(c.id) || [];

        // Recency score (0-30)
        const daysSinceContact = c.last_contact_date
          ? differenceInDays(new Date(), new Date(c.last_contact_date))
          : 90;
        const recencyScore = Math.max(0, 30 - daysSinceContact);

        // Deal velocity (0-30)
        const activeDeals = companyDeals.filter((d: any) => !["closed_won", "closed_lost"].includes(d.stage));
        const dealScore = Math.min(30, activeDeals.length * 10 + companyDeals.filter((d: any) => d.stage === "closed_won").length * 5);

        // Activity frequency (0-20)
        const recentActivities = companyActivities.filter(
          (a: any) => differenceInDays(new Date(), new Date(a.performed_at)) < 30
        );
        const activityScore = Math.min(20, recentActivities.length * 4);

        // VIP tier bonus (0-20)
        const tierBonus = c.vip_tier === "platinum" ? 20 : c.vip_tier === "gold" ? 15 : c.vip_tier === "silver" ? 10 : 0;

        const totalScore = Math.min(100, recencyScore + dealScore + activityScore + tierBonus);

        const trend: "up" | "down" | "stable" =
          daysSinceContact < 7 ? "up" : daysSinceContact > 30 ? "down" : "stable";

        return {
          id: c.id,
          name: c.name,
          logo_url: c.logo_url,
          score: totalScore,
          trend,
          factors: [
            { label: "Recency", score: recencyScore },
            { label: "Deal Velocity", score: dealScore },
            { label: "Activity", score: activityScore },
            { label: "VIP Tier", score: tierBonus },
          ],
        };
      }).sort((a: CompanyHealth, b: CompanyHealth) => b.score - a.score);
    },
    enabled: !!workspaceId,
  });

  const scoreColor = (score: number) =>
    score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-destructive";

  const trendIcons = {
    up: <TrendingUp className="h-3 w-3 text-green-500" />,
    down: <TrendingDown className="h-3 w-3 text-destructive" />,
    stable: <Minus className="h-3 w-3 text-muted-foreground" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Company Health Scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>
          ) : healthScores.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No companies yet.</p>
          ) : (
            <div className="space-y-3">
              {healthScores.map((company) => (
                <div key={company.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold">
                          {company.name[0]}
                        </div>
                      )}
                      <p className="text-xs font-medium truncate">{company.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {trendIcons[company.trend]}
                      <span className={`text-sm font-bold ${scoreColor(company.score)}`}>{company.score}</span>
                    </div>
                  </div>
                  <Progress value={company.score} className="h-1.5" />
                  <div className="flex gap-1.5 flex-wrap">
                    {company.factors.map((f) => (
                      <Badge key={f.label} variant="outline" className="text-[10px] px-1.5 py-0">
                        {f.label}: {f.score}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
