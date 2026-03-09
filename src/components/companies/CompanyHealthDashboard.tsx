import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCompanyHealthScores, useRecalculateHealthScore } from "@/hooks/use-company-health";
import { useCompanies } from "@/hooks/use-companies";
import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, HeartPulse, RefreshCw, Loader2, TrendingDown, Building2 } from "lucide-react";

const riskColors = {
  healthy: "bg-success/10 text-success border-success/30",
  at_risk: "bg-warning/10 text-warning border-warning/30",
  churning: "bg-destructive/10 text-destructive border-destructive/30",
};

const riskIcons = {
  healthy: Shield,
  at_risk: AlertTriangle,
  churning: TrendingDown,
};

export function CompanyHealthDashboard() {
  const { data: healthScores = [], isLoading } = useCompanyHealthScores();
  const { data: companies = [] } = useCompanies();
  const recalculate = useRecalculateHealthScore();
  const navigate = useNavigate();

  const companiesWithHealth = useMemo(() => {
    return companies.map((c) => {
      const health = healthScores.find((h) => h.company_id === c.id);
      return { ...c, health };
    }).sort((a, b) => (a.health?.overall_score ?? 999) - (b.health?.overall_score ?? 999));
  }, [companies, healthScores]);

  const atRisk = companiesWithHealth.filter((c) => c.health?.risk_level === "at_risk" || c.health?.risk_level === "churning");
  const healthy = companiesWithHealth.filter((c) => c.health?.risk_level === "healthy");
  const unscored = companiesWithHealth.filter((c) => !c.health);

  const recalcAll = () => {
    companies.forEach((c) => recalculate.mutate(c.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" /> Company Health Scores
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {atRisk.length} at risk · {healthy.length} healthy · {unscored.length} unscored
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={recalcAll} disabled={recalculate.isPending} className="gap-1.5">
          {recalculate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Recalculate All
        </Button>
      </div>

      {/* At-risk companies */}
      {atRisk.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-destructive uppercase tracking-wider">⚠ Needs Attention</p>
          {atRisk.map((c) => (
            <CompanyHealthCard key={c.id} company={c} health={c.health!} onClick={() => navigate(`/relationships/companies/${c.id}`)} />
          ))}
        </div>
      )}

      {/* Healthy */}
      {healthy.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-success uppercase tracking-wider">✓ Healthy</p>
          {healthy.slice(0, 10).map((c) => (
            <CompanyHealthCard key={c.id} company={c} health={c.health!} onClick={() => navigate(`/relationships/companies/${c.id}`)} />
          ))}
        </div>
      )}

      {/* Unscored */}
      {unscored.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unscored ({unscored.length})</p>
          <p className="text-xs text-muted-foreground">Click "Recalculate All" to score these companies</p>
        </div>
      )}
    </div>
  );
}

function CompanyHealthCard({ company, health, onClick }: { company: any; health: any; onClick: () => void }) {
  const Icon = riskIcons[health.risk_level as keyof typeof riskIcons] || Shield;

  return (
    <Card className="border-border bg-card hover:bg-accent/5 transition-colors cursor-pointer" onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-secondary/50 border border-border">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
          ) : (
            <Building2 className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
            <Badge variant="outline" className={`text-[10px] ${riskColors[health.risk_level as keyof typeof riskColors]}`}>
              <Icon className="w-3 h-3 mr-1" />
              {health.risk_level === "at_risk" ? "At Risk" : health.risk_level === "churning" ? "Churning" : "Healthy"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Progress value={health.overall_score} className="h-1.5 flex-1 max-w-[120px]" />
            <span className="text-xs text-muted-foreground">{health.overall_score}/100</span>
          </div>
          {health.risk_factors.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              {health.risk_factors.slice(0, 2).join(" · ")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
